// Build the unpatched table modules before any playground bundler applies the plugin.
// Leave the rest of the UI library and framework shared with the patched table.
import { build, type BuildOptions, type Plugin } from 'esbuild';
import { mkdir, mkdtempDisposable, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tableImporters } from './table-graph.ts';
import { tableEntry } from './aliases.ts';

const require = createRequire(import.meta.url);
const output = fileURLToPath(new URL('../node_modules/.cache/original-tables/', import.meta.url));
await mkdir(output, { recursive: true });
await using staging = await mkdtempDisposable(join(output, 'build-'));

for (const pkg of ['antd', 'antdv3', 'antdv40', 'antdv4', 'antdv-next']) {
  const entry = tableEntry(pkg);
  const engine =
    pkg === 'antd'
      ? createRequire(entry).resolve('@rc-component/table/es/index.js')
      : pkg === 'antdv-next'
        ? createRequire(entry).resolve('@v-c/table')
        : require.resolve(pkg + '/es/vc-table/index.js');
  const roots = [dirname(entry) + sep, dirname(engine) + sep];
  // Only the modules that import the patched Table.js (directly or indirectly)
  // need an original copy. Both tables can use the same cells, hooks and styles.
  const resolveTable = (include: (path: string) => boolean): Plugin => ({
    name: 'share-table-dependencies',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (args.kind === 'entry-point' || args.pluginData) return;
        if (/^(vue|react|react-dom)(\/|$)/.test(args.path))
          return { path: args.path, external: true };
        const result = await build.resolve(args.path, {
          kind: args.kind,
          resolveDir: args.resolveDir,
          pluginData: true,
        });
        if (result.errors.length) return { errors: result.errors };
        if (include(result.path)) return { path: result.path };
        return { path: './' + relative(output, result.path).split(sep).join('/'), external: true };
      });
    },
  });
  const filename = pkg + '.mjs';
  const options = {
    entryPoints: [entry],
    format: 'esm',
    bundle: true,
    outfile: join(staging.path, filename),
    define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
  } satisfies BuildOptions;
  const graph = await build({
    ...options,
    metafile: true,
    write: false,
    plugins: [resolveTable((path) => roots.some((root) => path.startsWith(root)))],
  });
  const relativeEntry = relative(process.cwd(), entry).split(sep).join('/');
  const original = new Set(
    [...tableImporters(graph.metafile.inputs, relativeEntry)].map((id) => resolve(id)),
  );
  await build({ ...options, plugins: [resolveTable((file) => original.has(file))] });
  await rename(join(staging.path, filename), join(output, filename));
}
