import shared from '../vite.shared.ts';
import { playgroundTitle } from '../aliases.ts';
export default {
  ...shared,
  define: { 'import.meta.env.VITE_PLAYGROUND_TITLE': JSON.stringify(playgroundTitle('Vite 7')) },
  server: { host: '0.0.0.0', port: 38672, strictPort: true },
  cacheDir: '../node_modules/.cache/vite7',
  build: { outDir: 'dist/vite7' },
};
