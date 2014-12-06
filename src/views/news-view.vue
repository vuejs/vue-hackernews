<style lang="stylus">
.news-view
  padding-left 0
  padding-right 0
  &.loading:before
    content "Loading..."
    position absolute
    top 16px
    left 20px
  .nav
    padding 10px 10px 10px 40px
    margin-top 10px
    border-top 2px solid #f60
    a
      margin-right 10px
      &:hover
        text-decoration underline
</style>

<template>
<div class="view news-view" v-class="loading:!items.length">
  <!-- item list -->
  <ul>
    <li class="item" v-repeat="items" v-component="item" track-by="id"></li>
  </ul>
  <!-- navigation -->
  <div class="nav" v-show="items.length > 0">
    <a v-if="params.page > 1" href="#/news/{{params.page - 1}}">&lt; prev</a>
    <a v-if="params.page < 4" href="#/news/{{params.page + 1}}">more...</a>
  </div>
</div>
</template>

<script>
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      params: {
        page: 1
      },
      displayPage: 1,
      items: []
    }
  },
  watch: {
    'params.page': 'update'
  },
  compiled: function () {
    this.update()
    store.on('update', this.update)
  },
  destroyed: function () {
    store.removeListener('update', this.update)
  },
  components: {
    item: require('../components/item.vue')
  },
  methods: {
    update: function () {
      store.fetchItemsByPage(this.params.page, function (items) {
        this.items = items
        this.displayPage = this.params.page
      }.bind(this))
    }
  }
}
</script>