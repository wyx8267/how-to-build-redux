const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    port: 9000,
    hot: true
  },
  entry: [
    path.resolve(__dirname, 'src/index.js')
    // path.resolve(__dirname, 'src/final/index.js')
  ],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './src/index.html',
      filename: './index.html'
    })
  ]
};