/**
 * A story component.
 */

Vue.component('story', {
  template: '#story-template',
  computed: {
    index: function () {
      return (this.$root.page - 1) * 30 + this.$index + 1
    },
    href: function () {
      return this.url || ('http://news.ycombinator.com/item?id=' + this.id)
    },
    isJob: function () {
      return this.type === 'job'
    },
    highlighted: function () {
      return this.$root.inspectedStory.id === this.id
    }
  }
})

/**
 * A comment component that recursively renders its own
 * children.
 */

Vue.component('comment', {
  template: '#comment-template',
  data: function () {
    return {
      comments: null
    }
  },
  created: function () {
    if (this.kids) {
      store.fetchItems(this.kids, function (comments) {
        this.comments = comments
      }.bind(this))
    }
  }
})

/**
 * Filter that onverts a timestamp to the format of
 * "xxx minutes/hours/days ago".
 *
 * @param {Number} time
 * @return {String}
 */

Vue.filter('fromNow', function (time) {
  var between = Date.now() / 1000 - Number(time)
  if (between < 3600) {
    return ~~(between / 60) + ' minutes'
  } else if (between < 86400) {
    return ~~(between / 3600) + ' hours'
  } else {
    return ~~(between / 86400) + ' days'
  }
})

/**
 * Filter that xtracts the domain from a url.
 *
 * @param {String}
 * @return {String}
 */

Vue.filter('domain', function (url) {
  var a = document.createElement('a')
  a.href = url
  return a.hostname
})

/**
 * Kick off the main app interface.
 */

var app = new Vue({

  el: '#app',

  data: {
    page: 1,
    stories: [],
    inspectedUser: null,
    inspectedStory: null,
    inspectedComments: null
  },

  created: function () {
    // refresh on story list update
    store.onUpdate(this.refresh.bind(this))
    // scroll back to top when switching pages
    this.$watch('page', function () {
      window.scrollTo(0, 0)
    })
  },

  methods: {

    /**
     * Refresh the displayed stories list based on current
     * page.
     */

    refresh: function () {
      var page = +window.location.hash.slice(1) || 1
      if (page > 4) {
        alert(
          'Sorry, but the HN API currently offers only ' +
          'the top 100 items :('
        )
        return
      }
      store.fetchStories(page, function (stories) {
        this.page = page
        this.stories = stories
      }.bind(this))
    },

    /**
     * Open user sidebar.
     */

    openUser: function (id) {
      store.fetchUser(id, function (user) {
        this.inspectedUser = user
      }.bind(this))
    },

    /**
     * Open comments sidebar.
     */

    openComments: function (story) {
      this.inspectedUser = null
      store.fetchItems(story.kids, function (comments) {
        this.inspectedComments = comments
      }.bind(this))
      this.inspectedStory = story
    }
  }
})

/**
 * React to hashchange for simple routing
 */

window.addEventListener('hashchange', function () {
  app.refresh()
})