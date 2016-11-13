import Firebase from 'firebase/app'
import Database from 'firebase/database'
import { EventEmitter } from 'events'
import { Promise } from 'es6-promise'

const config = {
  databaseURL: 'https://hacker-news.firebaseio.com'
}
Firebase.initializeApp(config)
const version = '/v0'
const api = Firebase.database().ref(version)
const itemsCache = Object.create(null)
const store = new EventEmitter()
const storiesPerPage = store.storiesPerPage = 30

let topStoryIds = []

export default store

/**
 * Subscribe to real time updates of the top 100 stories,
 * and cache the IDs locally.
 */

api.child('topstories').on('value', snapshot => {
  topStoryIds = snapshot.val()
  store.emit('topstories-updated')
})

/**
 * Fetch an item data with given id.
 *
 * @param {Number} id
 * @return {Promise}
 */

store.fetchItem = id => {
  return new Promise((resolve, reject) => {
    if (itemsCache[id]) {
      resolve(itemsCache[id])
    } else {
      api.child('item/' + id).once('value', snapshot => {
        const story = itemsCache[id] = snapshot.val()
        resolve(story)
      }, reject)
    }
  })
}

/**
 * Fetch the given list of items.
 *
 * @param {Array<Number>} ids
 * @return {Promise}
 */

store.fetchItems = ids => {
  if (!ids || !ids.length) {
    return Promise.resolve([])
  } else {
    return Promise.all(ids.map(id => store.fetchItem(id)))
  }
}

/**
 * Fetch items for the given page.
 *
 * @param {Number} page
 * @return {Promise}
 */

store.fetchItemsByPage = page => {
  const start = (page - 1) * storiesPerPage
  const end = page * storiesPerPage
  const ids = topStoryIds.slice(start, end)
  return store.fetchItems(ids)
}

/**
 * Fetch a user data with given id.
 *
 * @param {Number} id
 * @return {Promise}
 */

store.fetchUser = id => {
  return new Promise((resolve, reject) => {
    api.child('user/' + id).once('value', snapshot => {
      resolve(snapshot.val())
    }, reject)
  })
}
