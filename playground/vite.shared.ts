import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/vite';
import { aliases } from './aliases.ts';
export default {
  base: './',
  resolve: { alias: aliases },
  optimizeDeps: {
    // The React playground has its own entry point and dependency aliases.
    entries: ['index.html'],
    include: ['table-under-test', 'original-table'],
  },
  plugins: [AntdTableBetterScrollbar()],
};
