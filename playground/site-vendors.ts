// Keep the path from the demo entry to the plugin's Table.js in each native
// bundler. Other dependencies, including the original table, can be served once.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import ts from 'typescript';
import { reactTableAliases, vueTableAliases } from './aliases.ts';
import { tableImporters } from './table-graph.ts';
import { productionDefines, siteAliases } from './site-assets.ts';

function importedNames(source: ts.SourceFile, request: string) {
  const names = new Set<string>();
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
    const spec = node.moduleSpecifier;
    if (!spec || !ts.isStringLiteral(spec) || spec.text !== request) continue;
    const bindings = ts.isImportDeclaration(node)
      ? node.importClause?.namedBindings
      : node.exportClause;
    if (ts.isImportDeclaration(node) && node.importClause?.name) names.add('default');
    if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) {
      for (const item of bindings.elements)
        if (!item.isTypeOnly) names.add((item.propertyName ?? item.name).text);
    } else if (bindings || ts.isExportDeclaration(node)) {
      return ['*'];
    }
  }
  return [...names];
}

export async function buildSiteVendor(pkg: string, directory: string, shims: string) {
  const react = pkg === 'antd';
  const aliases = react ? reactTableAliases() : vueTableAliases(pkg);
  const dir = join(shims, pkg);
  await mkdir(dir);
  const entry = react ? 'playground/react/main.tsx' : 'playground/main.ts';
  const graph = await build({
    entryPoints: [entry],
    alias: aliases,
    define: productionDefines,
    jsx: 'automatic',
    bundle: true,
    outdir: directory,
    write: false,
    metafile: true,
  });
  const inputs = graph.metafile.inputs;
  const js = Object.values(graph.metafile.outputs).find((output) => output.entryPoint === entry)!;
  const antdBarrel = inputs[entry].imports.find((dep) => dep.original === 'antd')?.path;
  const native = tableImporters(inputs, entry);
  const files = new Map<string, Set<string>>();
  const imports: Record<string, Record<string, string>> = {};
  const runtimeAliases = siteAliases(react ? 'react' : 'vue', shims);
  for (const id of native) {
    const source = ts.createSourceFile(id, await readFile(id, 'utf8'), ts.ScriptTarget.Latest);
    const map: Record<string, string> = {};
    for (const dep of inputs[id].imports) {
      // antd's root re-exports the whole library. Only expose components the demo uses.
      if (id === antdBarrel && !(dep.path in js.inputs)) continue;
      const request = dep.original;
      if (
        !request ||
        dep.path.startsWith('playground/') ||
        native.has(dep.path) ||
        request in runtimeAliases ||
        dep.path.endsWith('.css') ||
        request === 'table-style'
      )
        continue;
      const names = importedNames(source, request);
      if (!names.length) continue;
      const key = resolve(dep.path);
      const selected = files.get(key) ?? new Set<string>();
      for (const name of names) selected.add(name);
      files.set(key, selected);
      map[request] = key;
    }
    imports[resolve(id)] = map;
  }
  const vendorExports: string[] = [];
  const facades = new Map<string, string>();
  for (const [file, names] of files) {
    const name = 'module' + facades.size;
    const namespace = 'globalThis.PlaygroundVendor.' + name;
    const specifier = JSON.stringify(file);
    if (names.has('*')) {
      vendorExports.push(`export * as ${name} from ${specifier};`);
      const shim = join(dir, name + '.cjs');
      await writeFile(shim, `module.exports = ${namespace};`);
      facades.set(file, shim);
      continue;
    }
    // Static member access lets esbuild drop unused exports from barrel files,
    // including the thousands of icons an application can choose from.
    const bindings = [...names];
    vendorExports.push(`import * as source${name} from ${specifier};`);
    const fields = bindings.map((key) => `${key}: source${name}.${key}`);
    vendorExports.push(`export const ${name} = { ${fields.join(', ')} };`);
    const shim = join(dir, name + '.mjs');
    const declarations = bindings.map(
      (key, i) => `const value${i} = ${namespace}.${key}; export { value${i} as ${key} };`,
    );
    await writeFile(shim, declarations.join('\n'));
    facades.set(file, shim);
  }
  for (const requests of Object.values(imports)) {
    for (const [request, file] of Object.entries(requests)) requests[request] = facades.get(file)!;
  }
  await writeFile(join(dir, 'imports.json'), JSON.stringify(imports));
  const result = await build({
    stdin: { contents: vendorExports.join('\n'), resolveDir: process.cwd() },
    define: productionDefines,
    alias: runtimeAliases,
    bundle: true,
    minify: true,
    outdir: directory,
    entryNames: pkg + '-[hash]',
    format: 'iife',
    globalName: 'PlaygroundVendor',
    metafile: true,
  });
  return (
    '../../shared/' +
    basename(Object.keys(result.metafile.outputs).find((id) => id.endsWith('.js'))!)
  );
}
