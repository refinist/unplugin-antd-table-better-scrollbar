// Vue CLI 5 loads its configuration through CommonJS.
const { AntdTableBetterScrollbar } = require('unplugin-antd-table-better-scrollbar/webpack');
const { vueDemo } = require('../aliases.ts');
module.exports = function vueCliConfig(library) {
  const { aliases, title } = vueDemo('Vue CLI', library);
  return {
    publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
    devServer: { host: '0.0.0.0', port: library ? 38683 : 38675 },
    productionSourceMap: false,
    configureWebpack: {
      resolve: { alias: aliases },
      module: { rules: [{ test: /\.ts$/, loader: require.resolve('esbuild-loader') }] },
      plugins: [AntdTableBetterScrollbar()],
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
