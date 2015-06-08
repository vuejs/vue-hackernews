module.exports = {
  entry: "./src/main.js",
  output: {
    path: './build',
    filename: "build.js"
  },
  module: {
    loaders: [
      { test: /\.vue$/, loader: "vue-multi-loader" },
    ]
  },
  devtool: '#source-map'
}