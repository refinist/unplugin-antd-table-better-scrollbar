import { sharedVendor } from '../site-resolver.ts';
import { siteOutput } from '../site-assets.ts';
import { defineConfig } from '@rsbuild/core';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/rspack';
import { vueDemo } from '../aliases.ts';
import { fileURLToPath } from 'node:url';

export function vueRsbuildConfig(library?: 'next') {
  const { aliases, title, route, pkg } = vueDemo('Rsbuild', library);
  return defineConfig({
    server: { host: '0.0.0.0', port: library ? 38682 : 38674, strictPort: true },
    html: { mountId: 'app', title },
    output: { assetPrefix: './', distPath: { root: siteOutput('rsbuild', route) ?? 'dist' } },
    source: { entry: { index: fileURLToPath(new URL('../main.ts', import.meta.url)) } },
    resolve: { alias: aliases },
    tools: {
      rspack: {
        plugins: [sharedVendor.rspack(pkg), AntdTableBetterScrollbar()],
      },
    },
  });
}
