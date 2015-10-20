import Vue from 'vue'
import Router from 'vue-router'
import { domain, fromNow } from './filters'
import App from './app.vue'
import NewsView from './views/news-view.vue'
import ItemView from './views/item-view.vue'
import UserView from './views/user-view.vue'

// install router
Vue.use(Router)

// register filters globally
Vue.filter('fromNow', fromNow)
Vue.filter('domain', domain)

// routing
var router = new Router()

router.map({
  '/news/:page': {
    component: NewsView
  },
  '/user/:id': {
    component: UserView
  },
  '/item/:id': {
    component: ItemView
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/news/1'
})

router.start(App, '#app')
