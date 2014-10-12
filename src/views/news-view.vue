<style lang="stylus">
.view.news
  padding-left 0
  
  &.loading:before
    content "Loading..."
    position absolute
    top 16px
    left 20px

  .nav
    padding 10px 10px 10px 40px
    border-top 2px solid #f60
    a
      margin-right 10px
      &:hover
        text-decoration underline
</style>

<template>
<div class="view news" v-with="page:params.page" v-class="loading:!items.length">
  <!-- item list -->
  <ul>
    <li class="item" v-repeat="items" v-component="item" trackby="id"></li>
  </ul>
  <!-- navigation -->
  <div class="nav" v-show="items.length > 0">
    <a v-if="page > 1" href="#/news/{{page - 1}}">&lt; prev</a>
    <a v-if="page < 4" href="#/news/{{page + 1}}">more...</a>
  </div>
</div>
</template>

<script>
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      page: 1,
      displayPage: 1,
      items: []
    }
  },
  compiled: function () {
    this.update()
    store.on('update', this.update)
    this.$watch('page', this.update)
  },
  destroyed: function () {
    store.removeListener('update', this.update)
  },
  components: {
    item: require('../components/item.vue')
  },
  methods: {
    update: function () {
      store.fetchItemsByPage(this.page, function (items) {
        this.items = items
        this.displayPage = this.page
      }.bind(this))
    }
  }
}
</script>