import { originalTablePath } from '../aliases.ts';
import type { Configuration } from 'webpack';
import 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { AntdTableBetterScrollbar } from 'unplugin-antd-table-better-scrollbar/react/webpack';
import { fileURLToPath } from 'node:url';
import { reactTitle } from '../react/title.ts';

export default {
  entry: fileURLToPath(new URL('../react/main.tsx', import.meta.url)),
  output: { clean: true },
  devServer: { host: '0.0.0.0', port: 38679 },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'esbuild-loader',
        options: { jsx: 'automatic' },
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: { alias: { 'original-react-table': originalTablePath('antd') } },
  plugins: [AntdTableBetterScrollbar(), new HtmlWebpackPlugin({ title: reactTitle('Webpack 5') })],
} satisfies Configuration;
