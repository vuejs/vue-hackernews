module.exports = {
  entry: "./src/main.js",
  output: {
    path: './build',
    filename: "build.js"
  },
  module: {
    loaders: [
      { test: /\.vue$/, loader: "vue-loader" },
    ]
  },
  devtool: '#source-map'
}
