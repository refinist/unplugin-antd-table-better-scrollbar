import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { test } from 'vite-plus/test';
import * as vite7 from 'vite7';
import * as vite8 from 'vite8';
import vuePlugin from '../src/index.ts';
import reactPlugin from '../src/react/index.ts';
import * as vueVite from '../src/vite.ts';
import * as reactVite from '../src/react/vite.ts';
import * as vueWebpack from '../src/webpack.ts';
import * as reactWebpack from '../src/react/webpack.ts';
import * as vueRspack from '../src/rspack.ts';
import * as reactRspack from '../src/react/rspack.ts';

test('adapter entries expose the matching framework and bundler', () => {
  for (const [name, vite, webpack, rspack] of [
    ['unplugin-antd-table-better-scrollbar', vueVite, vueWebpack, vueRspack],
    ['unplugin-antd-table-better-scrollbar/react', reactVite, reactWebpack, reactRspack],
  ] as const) {
    for (const entry of [vite, webpack, rspack]) {
      assert.equal(entry.default, entry.AntdTableBetterScrollbar);
    }
    const adapter = vite.default();
    assert.ok(!Array.isArray(adapter));
    assert.equal(adapter.name, name);
    assert.equal(typeof webpack.default().apply, 'function');
    assert.equal(typeof rspack.default().apply, 'function');
  }
  const vue = vuePlugin.raw(undefined, { framework: 'vite' });
  const react = reactPlugin.raw(undefined, { framework: 'vite' });
  assert.ok(!Array.isArray(vue) && !Array.isArray(react));
  for (const id of ['/pkg/es/vc-table/Table.js', 'C:\\pkg\\es\\vc-table\\Table.js']) {
    assert.equal(vue.transformInclude?.(id), true);
    assert.equal(react.transformInclude?.(id), false);
  }
  const id = '/node_modules/@rc-component/table/es/Table.js';
  assert.equal(vue.transformInclude?.(id), false);
  assert.equal(react.transformInclude?.(id), true);
});

test('Vite 7 prebundles the patched module and leaves lookalikes to esbuild', async ({
  onTestFinished,
}) => {
  const root = await mkdtemp(join(tmpdir(), 'scrollbar-esbuild-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const config = await vite7.resolveConfig(
    { configFile: false, plugins: [vueVite.default() as vite7.Plugin] },
    'serve',
  );
  const source = `export const style = { overflowY: 'scroll' };
    setScrollbarSize(getTargetScrollBarSize(scrollBodyRef.value).width);
    useProvideSticky();`;
  const entryPoints: Record<string, string> = {};
  for (const name of ['ant-design-vue', 'lookalike']) {
    const dir = join(root, name);
    await mkdir(join(dir, 'es/vc-table'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version: '4.2.6' }));
    const id = join(dir, 'es/vc-table/Table.js');
    await writeFile(id, source);
    entryPoints[name] = id;
  }
  const { outputFiles } = await build({
    entryPoints,
    outdir: root,
    write: false,
    plugins: config.optimizeDeps.esbuildOptions?.plugins,
  });
  const output = (name: string) =>
    outputFiles.find((file) => file.path === join(root, name + '.js'))?.text;
  assert.match(output('ant-design-vue')!, /overflowY: "auto"/);
  assert.match(output('lookalike')!, /overflowY: "scroll"/);
});

test('Vite 8 installs the Rolldown prebundle hook only during development', async () => {
  const plugin = reactVite.default();
  assert.ok(!Array.isArray(plugin));
  for (const command of ['serve', 'build'] as const) {
    const config = await vite8.resolveConfig({ configFile: false, plugins: [plugin] }, command);
    const plugins = config.optimizeDeps.rolldownOptions?.plugins ?? [];
    assert.ok(Array.isArray(plugins));
    assert.equal(
      plugins.some((item) => item && 'name' in item && item.name === plugin.name),
      command === 'serve',
    );
  }
});
