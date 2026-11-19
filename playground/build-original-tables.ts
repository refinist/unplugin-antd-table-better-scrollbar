// Build the unpatched table modules before any playground bundler applies the plugin.
// Leave the rest of the UI library and framework shared with the patched table.
import { build } from 'esbuild';
import { mkdir, mkdtempDisposable, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const output = fileURLToPath(new URL('../node_modules/.cache/original-tables/', import.meta.url));
await mkdir(output, { recursive: true });
await using staging = await mkdtempDisposable(join(output, 'build-'));

for (const pkg of ['antd', 'antdv3', 'antdv40', 'antdv4']) {
  const entry = require.resolve(pkg + '/es/table/index.js');
  const engine =
    pkg === 'antd'
      ? createRequire(entry).resolve('@rc-component/table/es/index.js')
      : require.resolve(pkg + '/es/vc-table/index.js');
  const roots = [dirname(entry) + sep, dirname(engine) + sep];
  const filename = pkg + '.mjs';
  await build({
    entryPoints: [entry],
    format: 'esm',
    bundle: true,
    outfile: join(staging.path, filename),
    define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
    plugins: [
      {
        name: 'share-table-dependencies',
        setup(build) {
          build.onResolve({ filter: /.*/ }, async (args) => {
            if (args.kind === 'entry-point' || args.pluginData) return;
            // Let the consuming bundler select the framework runtime (including Vue 3.3).
            if (/^(vue|react|react-dom)(\/|$)/.test(args.path))
              return { path: args.path, external: true };
            const result = await build.resolve(args.path, {
              kind: args.kind,
              resolveDir: args.resolveDir,
              pluginData: true,
            });
            if (result.errors.length) return { errors: result.errors };
            if (roots.some((root) => result.path.startsWith(root))) return { path: result.path };
            return {
              path: './' + relative(output, result.path).split(sep).join('/'),
              external: true,
            };
          });
        },
      },
    ],
  });
  await rename(join(staging.path, filename), join(output, filename));
}
