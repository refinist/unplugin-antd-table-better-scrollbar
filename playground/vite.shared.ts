import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/vite';
import { aliases } from './aliases.ts';
export default {
  base: './',
  resolve: { alias: aliases },
  optimizeDeps: { include: ['table-under-test', 'original-table'] },
  plugins: [AntdTableBetterScrollbar()],
};
