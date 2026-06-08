'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const isProd = process.env.NODE_ENV !== 'development';

module.exports = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? 'source-map' : 'eval-source-map',
  entry: './public/standalone.tsx',
  output: {
    path: path.resolve(__dirname, 'target/static'),
    filename: 'bundle.js',
    publicPath: '/api/babel/app/',
    clean: true,
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.webpack.json'),
            transpileOnly: true,
          },
        }],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/standalone.html',
      filename: 'index.html',
    }),
  ],
  performance: {
    // EUI ships a large bundle; suppress noise in CI
    maxAssetSize: 4 * 1024 * 1024,
    maxEntrypointSize: 4 * 1024 * 1024,
  },
};
