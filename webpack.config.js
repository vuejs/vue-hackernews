var vue = require('vue-loader')
var webpack = require('webpack')

module.exports = {
  entry: './src/main.js',
  output: {
    path: './static',
    publicPath: '/static/',
    filename: 'build.js'
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        // apply ES2015 transform to all JavaScript in *.vue files.
        // https://github.com/vuejs/vue-loader#advanced-loader-configuration
        loader: vue.withLoaders({
          js: 'babel'
        })
      },
      {
        test: /\.js$/,
        // excluding some local linked packages.
        // not needed for normal installations
        exclude: /node_modules|vue\/src|vue-loader\//,
        loader: 'babel'
      }
    ]
  },
  babel: {
    optional: ['runtime'],
    loose: 'all'
  }
}

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.optimize.OccurenceOrderPlugin()
  ]
} else {
  module.exports.devtool = '#source-map'
}
