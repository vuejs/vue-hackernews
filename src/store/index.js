import Firebase from 'firebase'
import { EventEmitter } from 'events'

const api = new Firebase('https://hacker-news.firebaseio.com/v0')
let cachedStoryIds = []
const cachedStories = {}
const store = new EventEmitter()
const storiesPerPage = store.storiesPerPage = 30

export default store

/**
 * Subscribe to real time updates of the top 100 stories,
 * and cache the IDs locally.
 */

api.child('topstories').on('value', (snapshot) => {
  cachedStoryIds = snapshot.val()
  store.emit('update')
})

/**
 * Fetch an item data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(item)
 */

store.fetchItem = (id, cb) => {
  if (cachedStories[id]) {
    cb(cachedStories[id])
  } else {
    api.child('item/' + id).once('value', function (snapshot) {
      const story = cachedStories[id] = snapshot.val()
      cb(story)
    })
  }
}

/**
 * Fetch the given list of items.
 *
 * @param {Array<Number>} ids
 * @param {Function} cb(items)
 */

store.fetchItems = (ids, cb) => {
  if (!ids || !ids.length) {
    return cb([])
  }
  const items = []
  ids.forEach((id) => {
    store.fetchItem(id, (item) => {
      items.push(item)
      if (items.length >= ids.length) {
        cb(items)
      }
    })
  })
}

/**
 * Fetch items for the given page.
 *
 * @param {Number} page
 * @param {Function} cb(stories)
 */

store.fetchItemsByPage = (page, cb) => {
  const start = (page - 1) * storiesPerPage
  const end = page * storiesPerPage
  const ids = cachedStoryIds.slice(start, end)
  store.fetchItems(ids, cb)
}

/**
 * Fetch a user data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(user)
 */

store.fetchUser = (id, cb) => {
  api.child('user/' + id).once('value', (snapshot) => {
    cb(snapshot.val())
  })
}
