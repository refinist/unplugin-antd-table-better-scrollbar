import { sharedVendor } from '../site-resolver.ts';
import { reactRoute, siteOutput } from '../site-assets.ts';
import { reactTableAliases } from '../aliases.ts';
import { defineConfig } from '@rsbuild/core';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/react/rspack';
import { fileURLToPath } from 'node:url';
import { reactTitle } from '../react/title.ts';

export default defineConfig({
  server: { host: '0.0.0.0', port: 38678, strictPort: true },
  html: { mountId: 'app', title: reactTitle('Rsbuild') },
  resolve: { alias: reactTableAliases() },
  source: { entry: { index: fileURLToPath(new URL('../react/main.tsx', import.meta.url)) } },
  output: { assetPrefix: './', distPath: { root: siteOutput('rsbuild', reactRoute) ?? 'dist' } },
  tools: {
    rspack: {
      plugins: [sharedVendor.rspack('antd'), AntdTableBetterScrollbar()],
    },
  },
});
