import { existsSync, readFileSync } from 'node:fs';
import MagicString from 'magic-string';
import { createUnplugin } from 'unplugin';

import { observeBody } from './observe.ts';

export const observeCall = `(${observeBody.toString()})(body, setScrollbarSize)`;

// Filename filters also match application files. Only patch modules owned by the target package.
export function packageVersion(manifest: string, name: string): string | undefined {
  if (!existsSync(manifest)) return;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; version?: string };
  if (pkg.name === name) return pkg.version;
}

export function applyEdits(code: string, id: string, changes: string[][], label: string) {
  const output = new MagicString(code);
  for (const [before, after] of changes) {
    const index = code.indexOf(before);
    if (index < 0 || index !== code.lastIndexOf(before)) {
      throw new Error(
        `Unexpected ${label} source in ${id}: expected exactly one match for ${before}`,
      );
    }
    output.overwrite(index, index + before.length, after);
  }
  return { code: output.toString(), map: output.generateMap({ hires: true, source: id }) };
}

export function tablePlugin(
  name: string,
  target: RegExp,
  transformTable: (code: string, id: string) => ReturnType<typeof applyEdits> | undefined,
) {
  return createUnplugin<undefined>(() => ({
    name,
    enforce: 'pre',
    transformInclude: (id) => target.test(id),
    transform: transformTable,
    vite: {
      config(_, { command }) {
        if (command !== 'serve') return;
        if (Number.parseInt(String(this.meta.viteVersion), 10) >= 8) {
          return {
            optimizeDeps: {
              rolldownOptions: {
                plugins: [
                  {
                    name,
                    transform: { filter: { id: target }, handler: transformTable },
                  },
                ],
              },
            },
          };
        }
        return {
          optimizeDeps: {
            esbuildOptions: {
              plugins: [
                {
                  name,
                  setup(build: import('esbuild').PluginBuild) {
                    build.onLoad({ filter: target }, ({ path }) => {
                      const result = transformTable(readFileSync(path, 'utf8'), path);
                      if (result) return { contents: result.code, loader: 'js' };
                    });
                  },
                },
              ],
            },
          },
        };
      },
    },
  }));
}
