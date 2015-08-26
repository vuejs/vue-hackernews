/**
 * Boot up the Vue instance and wire up the router.
 */

var Vue = require('vue')
var Router = require('director').Router

// strict mode
Vue.config.strict = true

// global filters
Vue.filter('fromNow', require('./filters/from-now'))
Vue.filter('domain', require('./filters/domain'))

// global components
Vue.component('comment', require('./components/comment.vue'))
Vue.component('item', require('./components/item.vue'))

// app instance
var app = new Vue(require('./app.vue'))

// routing
var router = new Router()

router.on('/news/:page', function (page) {
  app.view = 'news-view'
  app.params.page = +page
})

router.on('/user/:id', function (id) {
  window.scrollTo(0, 0)
  app.view = 'user-view'
  app.params.userId = id
})

router.on('/item/:id', function (id) {
  window.scrollTo(0, 0)
  app.view = 'item-view'
  app.params.itemId = id
})

router.configure({
  notfound: function () {
    router.setRoute('/news/1')
  }
})

router.init('/news/1')
