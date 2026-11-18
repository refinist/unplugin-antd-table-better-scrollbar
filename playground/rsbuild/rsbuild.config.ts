import { defineConfig } from '@rsbuild/core';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/rspack';
import { aliases, playgroundTitle } from '../aliases.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: { host: '0.0.0.0', port: 38674, strictPort: true },
  html: { mountId: 'app', title: playgroundTitle('Rsbuild') },
  output: { assetPrefix: './' },
  source: { entry: { index: fileURLToPath(new URL('../main.ts', import.meta.url)) } },
  resolve: { alias: aliases },
  tools: { rspack: { plugins: [AntdTableBetterScrollbar()] } },
});
