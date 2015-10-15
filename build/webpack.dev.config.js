module.exports = {
  entry: ['webpack/hot/dev-server', './src/main.js'],
  output: {
    publicPath: '/static/',
    filename: 'build.js'
  },
  module: {
    loaders: [
      { test: /\.vue$/, loader: 'vue' },
    ]
  },
  devtool: '#source-map'
}
