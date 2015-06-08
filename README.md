# Vue.js HackerNews clone

[Live demo](http://vuejs.github.io/vue-hackernews/)

Built with [Vue.js](http://vuejs.org) and the official [HackerNews API](https://github.com/HackerNews/API), with routing, comments, comment folding, user profile & realtime updates.

The build setup uses Webpack and the [vue-multi-loader](https://github.com/Q42/vue-multi-loader) plugin, which enables Vue components to be written in a format that encapsulates a component's style, template and logic in a single file.

If you are using SublimeText you can get proper syntax highlighting for `*.vue` files with [vue-syntax-highlight](https://github.com/vuejs/vue-syntax-highlight).

There's also a version of this app built with Browserify + [Vueify](https://github.com/vuejs/vueify) in the [browserify branch](https://github.com/vuejs/vue-hackernews/tree/browserify), although it is recommended to use the Webpack-based setup because of better dependency tracking enabled via Webpack loaders.

### Building

``` bash
npm install
# watch:
npm run dev
# build:
npm run build
```
