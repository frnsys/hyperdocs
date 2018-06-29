var path = require('path');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: ['@babel/polyfill', './src/index'],
  output: {
    filename: 'bundle.js'
  },
  target: 'electron-main',
  devtool: 'source-map',
  module: {
    rules: [{
      test: /\.(sass|scss)$/,
      use: ExtractTextPlugin.extract({ fallback: 'style-loader', use: 'css-loader!sass-loader' })
    }, {
      test: /\.css$/,
      use: [{
          loader: "style-loader" // creates style nodes from JS strings
      }, {
          loader: "css-loader" // translates CSS into CommonJS
      }]
    }, {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react'],
          plugins: ['@babel/plugin-proposal-class-properties']
        }
      }
    }]
  },
  plugins: [
    new ExtractTextPlugin('css/style.css')
  ],
  resolve: {
    extensions: ['.js', '.sass']
  }
};

