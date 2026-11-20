import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/vite';
import { vueDemo } from './aliases.ts';

export function vueViteConfig(vite: 7 | 8, library?: 'next') {
  const demo = vueDemo(process.env.PLAYGROUND_VITE_LABEL ?? `Vite ${vite}`, library);
  const name = `${library ? 'antdv-next-' : ''}vite${vite}`;
  return {
    base: './',
    resolve: { alias: demo.aliases },
    optimizeDeps: { entries: ['index.html'], include: ['table-under-test', 'original-table'] },
    plugins: [AntdTableBetterScrollbar()],
    define: { 'import.meta.env.VITE_PLAYGROUND_TITLE': JSON.stringify(demo.title) },
    server: { host: '0.0.0.0', port: (library ? 38680 : 38672) + (vite - 7), strictPort: true },
    cacheDir: `../node_modules/.cache/${name}`,
    build: { outDir: `dist/${name}` },
  };
}
