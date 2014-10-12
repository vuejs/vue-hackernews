<style lang="stylus">
@import "src/shared.styl"
.item-view
  .item
    padding-left 0
    margin-bottom 30px
    .index, .comments-link
      display none
  .poll-options
    margin-left 30px
    margin-bottom 40px
    li
      margin 12px 0
    p
      margin 8px 0
    .subtext
      color $gray
      font-size 11px
</style>

<template>
  <div class="view item-view" v-with="id:params.itemId" v-show="item">
    <div class="item" v-component="item" v-with="item"></div>
    <ul class="poll-options" v-if="pollOptions">
      <li v-repeat="pollOptions">
        <p>{{text}}</p>
        <p class="subtext">{{score}} points</p>
      </li>
    </ul>
    <ul class="comments" v-if="comments">
      <li v-repeat="comments" v-component="comment" v-show="text"></li>
    </ul>
    <p v-show="!comments.length">No comments yet.</p>
  </div>
</template>

<script>
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      id: null,
      item: null,
      pollOptions: null,
      comments: null
    }
  },
  compiled: function () {
    this.update()
    this.$watch('id', this.update)
  },
  methods: {
    update: function () {
      store.fetchItem(this.id, function (item) {
        this.item = item
        this.fetchComments()
        if (item.type === 'poll') {
          this.fetchPollOptions()
        }
      }.bind(this))
    },
    fetchComments: function () {
      store.fetchItems(this.item.kids, function (comments) {
        this.comments = comments
      }.bind(this))
    },
    fetchPollOptions: function () {
      store.fetchItems(this.item.parts, function (options) {
        this.pollOptions = options
      }.bind(this))
    }
  },
  components: {
    item: require('../components/item.vue'),
    comment: require('../components/comment.vue')
  }
}
</script>