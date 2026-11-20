// The three bundlers still compile their own patched table. The static pages load the
// same framework runtime and AntDV 3 stylesheet from this site's shared directory.
import type { OutputFile } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const reactModules = {
  'react-dom/client': 'ReactDOMClient',
  'react-dom': 'ReactDOM',
  'react/jsx-runtime': 'JSXRuntime',
  react: 'React',
};

export const productionDefines = {
  'process.env.NODE_ENV': '"production"',
  __VUE_OPTIONS_API__: 'true',
  __VUE_PROD_DEVTOOLS__: 'false',
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
};

export const vueRoute = (major: string) =>
  major === 'next' ? 'vue-antdv-next' : `vue-antdv${major}`;
export const reactRoute = 'react-antd6';

export function siteOutput(tool: string, route: string) {
  const site = process.env.PLAYGROUND_SITE_OUTPUT;
  return site ? join(site, route, tool) : undefined;
}

export function siteAliases(
  framework: 'vue' | 'react',
  shims = process.env.PLAYGROUND_SITE_SHIMS,
): Record<string, string> {
  if (!shims) return {};
  const modules = framework === 'vue' ? { vue: 'Vue' } : reactModules;
  return Object.fromEntries(
    Object.entries(modules).map(([id, name]) => [id, join(shims, name + '.cjs')]),
  );
}

export async function buildSiteAssets(directory: string, shims: string) {
  const { build } = await import('esbuild');
  await mkdir(directory, { recursive: true });
  for (const name of ['Vue', ...Object.values(reactModules)]) {
    const runtime = name === 'Vue' ? 'Vue' : `PlaygroundReact.${name}`;
    await writeFile(join(shims, name + '.cjs'), `module.exports = globalThis.${runtime};\n`);
  }
  await writeFile(join(shims, 'empty.css'), '');
  const options = {
    outdir: directory,
    entryNames: '[name]-[hash]',
    bundle: true,
    minify: true,
    write: false,
    define: productionDefines,
  } as const;
  const [vue, react, style] = await Promise.all([
    build({
      ...options,
      globalName: 'Vue',
      format: 'iife',
      entryPoints: { vue: 'vue/dist/vue.runtime.esm-bundler.js' },
    }),
    build({
      ...options,
      globalName: 'PlaygroundReact',
      format: 'iife',
      stdin: {
        contents: Object.entries(reactModules)
          .map(([id, name]) => `export { default as ${name} } from "${id}";`)
          .join('\n'),
        resolveDir: process.cwd(),
        sourcefile: 'react.js',
      },
      entryNames: 'react-[hash]',
    }),
    build({ ...options, entryPoints: { antdv3: 'playground/antdv3-style.ts' } }),
  ]);
  async function save(files: OutputFile[], extension: string) {
    const file = files.find((output) => output.path.endsWith(extension));
    if (!file) throw new Error(`Missing shared site asset for ${extension}`);
    await writeFile(file.path, file.contents);
    return '../../shared/' + basename(file.path);
  }
  return {
    vue: await save(vue.outputFiles, '.js'),
    react: await save(react.outputFiles, '.js'),
    antdv3: await save(style.outputFiles, '.css'),
  };
}
