var Firebase = require('firebase')
var api = new Firebase('https://hacker-news.firebaseio.com/v0')
var storiesPerPage = 30
var cachedStoryIds = []
var Emitter = require('events').EventEmitter
var store = module.exports = new Emitter()

/**
 * Subscribe to real time updates of the top 100 stories,
 * and cache the IDs locally.
 */

api.child('topstories').on('value', function (snapshot) {
  cachedStoryIds = snapshot.val()
  store.emit('update')
})

/**
 * Fetch an item data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(item)
 */

store.fetchItem = function (id, cb) {
  api.child('item/' + id).once('value', function (snapshot) {
    cb(snapshot.val())
  })
}

/**
 * Fetch a user data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(user)
 */

store.fetchUser = function (id, cb) {
  api.child('user/' + id).once('value', function (snapshot) {
    cb(snapshot.val())
  })
}

/**
 * Fetch the given list of items.
 *
 * @param {Array<Number>} ids
 * @param {Function} cb(items)
 */

store.fetchItems = function (ids, cb) {
  if (!ids || !ids.length) return cb([])
  var items = []
  ids.forEach(function (id) {
    store.fetchItem(id, addItem)
  })
  function addItem (item) {
    items.push(item)
    if (items.length >= ids.length) {
      cb(items)
    }
  }
}

/**
 * Fetch items for the given page.
 *
 * @param {Number} page
 * @param {Function} cb(stories)
 */

store.fetchItemsByPage = function (page, cb) {
  var start = (page - 1) * storiesPerPage
  var end = page * storiesPerPage
  var ids = cachedStoryIds.slice(start, end)
  store.fetchItems(ids, cb)
}