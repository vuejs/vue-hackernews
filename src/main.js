import Vue from 'vue'
import Router from 'vue-router'
import { domain, fromNow } from './filters'
import App from './components/App.vue'
import NewsView from './components/NewsView.vue'
import ItemView from './components/ItemView.vue'
import UserView from './components/UserView.vue'

// install router
Vue.use(Router)

// register filters globally
Vue.filter('fromNow', fromNow)
Vue.filter('domain', domain)

// routing
var router = new Router({
    // Remove hashbang
    // history: true,
    // hashbang: false,
})

router.map({
  '/news/:page': {
    component: NewsView,
    // name is optional and only when you need named routes
    name: 'news',
  },
  '/user/:id': {
    component: UserView,
    name: 'user',
  },
  '/item/:id': {
    component: ItemView,
    name: 'item',
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/news/1'
})

router.start(App, '#app')
