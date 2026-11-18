// Vue CLI 5 loads its configuration through CommonJS.
const { AntdTableBetterScrollbar } = require('unplugin-antd-table-better-scrollbar/webpack');
const { aliases, playgroundTitle } = require('../aliases.ts');
module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  devServer: { host: '0.0.0.0', port: 38675 },
  productionSourceMap: false,
  configureWebpack: {
    resolve: { alias: aliases },
    module: { rules: [{ test: /\.ts$/, loader: require.resolve('esbuild-loader') }] },
    plugins: [AntdTableBetterScrollbar()],
  },
  pages: {
    index: {
      title: playgroundTitle('Vue CLI'),
      entry: require.resolve('../main.ts'),
      chunks: ['chunk-vendors', 'chunk-common', 'index'],
    },
  },
};
