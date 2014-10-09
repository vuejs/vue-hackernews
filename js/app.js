var api = new Firebase('https://hacker-news.firebaseio.com/v0')
var storiesPerPage = 30
var topStories = []
var page = getPage()

/**
 * Get the page number from the current hash.
 *
 * @return {Number}
 */

function getPage () {
  return +window.location.hash.slice(1) || 1
}

/**
 * React to top stories realtime updates.
 */

api.child('topstories').on('value', function (snapshot) {
  topStories = snapshot.val()
  loadStories()
})

/**
 * React to hash change.
 */

window.addEventListener('hashchange', loadStories)

/**
 * Load the stories with pagination.
 */

function loadStories () {
  var page = getPage()
  if (page > 4) {
    alert(
      'Sorry, but the HN API currently only offers the ' +
      'top 100 items :('
    )
    return
  }

  var stories = []
  var start = (page - 1) * storiesPerPage
  var end = page * storiesPerPage
  var toLoad = Math.min(storiesPerPage, 100 - start)

  topStories.slice(start, end).forEach(function (id) {
    api.child('item/' + id).once('value', addItem)
  })

  function addItem (snapshot) {
    stories.push(snapshot.val())
    if (stories.length >= toLoad) {
      done()
    }
  }

  function done () {
    app.stories = stories
    app.page = page
  }
}

/**
 * Boot up the Vue app =====================================
 */

var app = new Vue({
  el: '#app',
  data: {
    page: 1,
    stories: [],
    user: null,
    story: null
  },
  created: function () {
    this.$watch('page', function () {
      window.scrollTo(0, 0)
    })
  },
  filters: {
    fromNow: function (time) {
      var between = Date.now() / 1000 - Number(time)
      if (between < 3600) {
        return ~~(between / 60) + ' minutes'
      } else if (between < 86400) {
        return ~~(between / 3600) + ' hours'
      } else {
        return ~~(between / 86400) + ' days'
      }
    },
    domain: function (url) {
      var a = document.createElement('a')
      a.href = url
      return a.hostname
    }
  },
  methods: {
    openUser: function (id) {
      app.story = null
      api.child('user/' + id).once('value', function (snapshot) {
        app.user = snapshot.val()
      })
    },
    openComments: function (story) {
      app.user = null
      app.story = story
    },
    closeSidebar: function () {
      app.story = app.user = null
    }
  }
})