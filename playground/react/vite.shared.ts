import { originalTablePath } from '../aliases.ts';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/react/vite';
import { reactTitle } from './title.ts';

export function reactViteConfig(major: 7 | 8) {
  return {
    base: './',
    resolve: { alias: { 'original-react-table': originalTablePath('antd') } },
    plugins: [AntdTableBetterScrollbar()],
    define: {
      'import.meta.env.VITE_PLAYGROUND_TITLE': JSON.stringify(
        reactTitle(process.env.PLAYGROUND_VITE_LABEL ?? 'Vite ' + major),
      ),
    },
    cacheDir: '../../node_modules/.cache/react-vite' + major,
    build: { outDir: '../react-vite' + major + '/dist', emptyOutDir: true },
    server: { host: '0.0.0.0', port: major === 7 ? 38676 : 38677, strictPort: true },
  };
}
