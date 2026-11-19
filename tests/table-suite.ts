import { afterAll, beforeAll, test } from 'vite-plus/test';
import { chromium, type Browser } from '@playwright/test';
import assert from 'node:assert/strict';
import { verifyTable } from './verify-table.ts';
import { resolve } from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

function vueAliases(version: string, name: string) {
  const pkg = resolve('node_modules', name);
  return {
    ...(version === '4.0.0'
      ? { vue: resolve('node_modules/vue33/dist/vue.runtime.esm-bundler.js') }
      : {}),
    'demo-ui': pkg + '/es',
    'original-table': pkg + '/lib/table/index.js',
    'table-under-test': pkg + '/es/table/index.js',
    'table-style': pkg + (version.startsWith('3.') ? '/dist/antd.css' : '/dist/reset.css'),
  };
}

export function testTables(vite: typeof import('vite7') | typeof import('vite8')) {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch({
      channel: process.env.CHROME_CHANNEL || undefined,
      ignoreDefaultArgs: ['--hide-scrollbars'],
      args: ['--disable-features=OverlayScrollbar'],
    });
  });
  afterAll(() => browser?.close());

  for (const [version, name] of [
    ['3.2.20', 'antdv3'],
    ['4.0.0', 'antdv40'],
    ['4.2.6', 'antdv4'],
    ['6.7.1', 'antd'],
  ]) {
    const react = name === 'antd';
    for (const mode of ['dev', 'build']) {
      test(
        (react ? 'Ant Design React ' : 'AntDV ') + version + ' / Vite ' + vite.version + ' ' + mode,
        async ({ onTestFinished }) => {
          const bundler = 'vite' + vite.version.split('.')[0];
          const config = {
            root: resolve(react ? 'playground/react' : 'playground'),
            logLevel: 'error' as const,
            configFile: resolve('playground', (react ? 'react-' : '') + bundler, 'vite.demo.ts'),
            optimizeDeps: { force: true },
            cacheDir: resolve('node_modules/.vite-' + vite.version + '-' + version),
            resolve: { alias: react ? {} : vueAliases(version, name) },
            server: { host: '127.0.0.1', port: 0, strictPort: false },
          };
          let server;
          if (mode === 'build') {
            const outDir = await mkdtemp(resolve(tmpdir(), 'antdv-scrollbar-'));
            onTestFinished(() => rm(outDir, { recursive: true, force: true }));
            await vite.build({ ...config, build: { outDir } });
            server = await vite.preview({
              ...config,
              build: { outDir },
              preview: { host: '127.0.0.1', port: 0, strictPort: false },
            });
          } else {
            server = await vite.createServer(config);
            await server.listen();
          }
          onTestFinished(() => server.close());
          await verifyTable(
            browser,
            server.resolvedUrls?.local[0] ?? assert.fail('Missing server URL'),
            react ? 'react' : 'vue',
          );
          if (mode === 'dev') {
            const metadata = await readFile(
              resolve(config.cacheDir, 'deps/_metadata.json'),
              'utf8',
            );
            const { optimized } = JSON.parse(metadata) as {
              optimized: Record<string, { src: string }>;
            };
            if (react) assert.match(optimized.antd.src, /antd/);
            else assert.match(optimized['table-under-test'].src, /ant-design-vue/);
          }
        },
      );
    }
  }
}
