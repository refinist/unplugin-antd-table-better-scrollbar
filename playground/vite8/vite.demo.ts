import shared from '../vite.shared.ts';
import { playgroundTitle } from '../aliases.ts';
export default {
  ...shared,
  define: {
    'import.meta.env.VITE_PLAYGROUND_TITLE': JSON.stringify(
      playgroundTitle(process.env.PLAYGROUND_VITE_LABEL ?? 'Vite 8'),
    ),
  },
  server: { host: '0.0.0.0', port: 38673, strictPort: true },
  cacheDir: '../node_modules/.cache/vite8',
  build: { outDir: 'dist/vite8' },
};
