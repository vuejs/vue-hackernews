module.exports = {
  entry: ['webpack/hot/dev-server', './src/main.js'],
  output: {
    path: './static',
    filename: 'build.js'
  },
  module: {
    loaders: [
      { test: /\.vue$/, loader: "vue-loader" },
    ]
  },
  devtool: '#source-map'
}
