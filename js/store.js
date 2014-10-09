/**
 * A global store object that encapsulates the Firebase API.
 */

(function () {

  var api = new Firebase('https://hacker-news.firebaseio.com/v0')
  var storiesPerPage = 30
  var cachedStoryIds = []
  var onUpdateCb = null
  var store = {}

  /**
   * Subscribe to real time updates of the top 100 stories,
   * and cache the IDs locally.
   */

  api.child('topstories').on('value', function (snapshot) {
    cachedStoryIds = snapshot.val()
    onUpdateCb && onUpdateCb()
  })

  /**
   * Fetch the given list of items.
   *
   * @param {Array<Number>} ids
   * @param {Function} cb(items)
   */

  store.fetchItems = function (ids, cb) {
    if (!ids) return cb([])
    var items = []
    ids.forEach(function (id) {
      api.child('item/' + id).once('value', addComment)
    })
    function addComment (snapshot) {
      items.push(snapshot.val())
      if (items.length >= ids.length) {
        cb(items)
      }
    }
  }

  /**
   * Fetch the stories for the given page.
   *
   * @param {Number} page
   * @param {Function} cb(stories)
   */

  store.fetchStories = function (page, cb) {
    var start = (page - 1) * storiesPerPage
    var end = page * storiesPerPage
    var ids = cachedStoryIds.slice(start, end)
    store.fetchItems(ids, cb)
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
   * Set the callback to call when the top stories list
   * has updated.
   *
   * @param {Function} cb
   */

  store.onUpdate = function (cb) {
    onUpdateCb = cb
  }

  window.store = store

})()