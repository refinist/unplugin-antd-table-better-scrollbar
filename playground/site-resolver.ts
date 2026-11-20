import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { createUnplugin } from 'unplugin';
import MagicString from 'magic-string';

// Replace import paths after the scrollbar plugin has transformed the real table
// source. This also works with aliases resolved internally by Vite's bundler.
export const sharedVendor = createUnplugin((pkg: string) => {
  const dir = process.env.PLAYGROUND_SITE_SHIMS;
  const name = 'playground-shared-vendor';
  if (!dir) return { name };
  const imports = JSON.parse(readFileSync(join(dir, pkg, 'imports.json'), 'utf8')) as Record<
    string,
    Record<string, string>
  >;
  return {
    name,
    enforce: 'post',
    transformInclude: (id) => !!imports[normalize(id)],
    async transform(code, id) {
      const { default: ts } = await import('typescript');
      const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest);
      const output = new MagicString(code);
      for (const node of source.statements) {
        if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
        const spec = node.moduleSpecifier;
        if (!spec || !ts.isStringLiteral(spec)) continue;
        const shim = imports[normalize(id)][spec.text];
        if (shim) output.overwrite(spec.getStart(source), spec.end, JSON.stringify(shim));
      }
      return output.toString();
    },
  };
});
