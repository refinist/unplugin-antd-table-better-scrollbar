const { sharedVendor } = require('../site-resolver.ts');
// Vue CLI 5 loads its configuration through CommonJS.
const { AntdTableBetterScrollbar } = require('unplugin-antd-table-better-scrollbar/webpack');
const { siteOutput } = require('../site-assets.ts');
const { vueDemo } = require('../aliases.ts');
module.exports = function vueCliConfig(library) {
  const { aliases, title, route, pkg } = vueDemo('Vue CLI', library);
  return {
    outputDir: siteOutput('vue-cli', route) ?? 'dist',
    publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
    devServer: { host: '0.0.0.0', port: library ? 38683 : 38675 },
    productionSourceMap: false,
    configureWebpack: {
      resolve: {
        alias: process.env.PLAYGROUND_SITE_SHIMS ? { ...aliases, vue$: aliases.vue } : aliases,
      },
      module: { rules: [{ test: /\.ts$/, loader: require.resolve('esbuild-loader') }] },
      plugins: [sharedVendor.webpack(pkg), AntdTableBetterScrollbar()],
    },
    pages: {
      index: {
        title,
        template: require.resolve('./public/index.html'),
        entry: require.resolve('../main.ts'),
        chunks: ['chunk-vendors', 'chunk-common', 'index'],
      },
    },
  };
};
