<template>
  <div class="news-view" :class="{ loading: !items.length }">
    <!-- item list -->
    <item
      v-for="item in items"
      :item="item"
      :index="getItemIndex($index)"
      track-by="id">
    </item>
    <!-- navigation -->
    <div class="nav" v-show="items.length > 0">
      <a v-if="displayPage > 1" :href="'#/news/' + (displayPage - 1)">&lt; prev</a>
      <a v-if="displayPage < 4" :href="'#/news/' + (displayPage + 1)">more...</a>
    </div>
  </div>
</template>

<script>
import store from '../store'
import Item from '../components/item.vue'

export default {
  components: {
    item: Item
  },
  data () {
    return {
      displayPage: 1,
      items: []
    }
  },
  created () {
    this.onUpdate = () => {
      this.update(this.$route.params.page)
    }
    store.on('update', this.onUpdate)
  },
  destroyed () {
    store.removeListener('update', this.onUpdate)
  },
  route: {
    data ({ to }) {
      this.update(to.params.page)
    }
  },
  methods: {
    update (page) {
      store.fetchItemsByPage(page, (items) => {
        this.items = items
        this.displayPage = +page
      })
    },
    getItemIndex (index) {
      return (this.displayPage - 1) * store.storiesPerPage + index + 1
    }
  }
}
</script>

<style lang="stylus">
.news-view
  padding-left 5px
  padding-right 15px
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
