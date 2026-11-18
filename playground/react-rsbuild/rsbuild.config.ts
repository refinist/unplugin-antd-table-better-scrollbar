import { defineConfig } from '@rsbuild/core';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/react/rspack';
import { fileURLToPath } from 'node:url';
import { reactTitle } from '../react/title.ts';

export default defineConfig({
  server: { host: '0.0.0.0', port: 38678, strictPort: true },
  html: { mountId: 'app', title: reactTitle('Rsbuild') },
  source: { entry: { index: fileURLToPath(new URL('../react/main.tsx', import.meta.url)) } },
  output: { assetPrefix: './' },
  tools: { rspack: { plugins: [AntdTableBetterScrollbar()] } },
});
