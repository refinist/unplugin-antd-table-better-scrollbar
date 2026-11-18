import { defineConfig } from 'vite-plus';
export default defineConfig({
  pack: {
    entry: [
      'src/index.ts',
      'src/vite.ts',
      'src/rspack.ts',
      'src/webpack.ts',
      'src/react/vite.ts',
      'src/react/webpack.ts',
      'src/react/rspack.ts',
    ],
    fixedExtension: false,
    dts: true,
    deps: { neverBundle: ['vite'] },
  },
  test: { globalSetup: ['./tests/build-plugin.ts'], testTimeout: 60000, restoreMocks: true },
  fmt: { singleQuote: true, jsxSingleQuote: true },
  lint: { options: { typeAware: true, typeCheck: true } },
  staged: { '*': 'vp check --fix' },
});
