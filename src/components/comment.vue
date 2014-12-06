<style lang="stylus">
@import "src/shared.styl"

.comhead
  color $gray
  font-size 11px
  margin-bottom 8px
  a
    color $gray
    &:hover
      text-decoration underline
  .toggle
    margin-right 4px

.comment-content
  margin 0 0 16px 24px

.child-comments
  margin 8px 0 8px 22px
</style>

<template>
  <li v-show="text">
    <div class="comhead">
      <a class="toggle" v-on="click:open = !open">{{open ? '[-]' : '[+]'}}</a>
      <a href="#/user/{{by}}">{{by}}</a>
      {{time | fromNow}} ago
    </div>
    <div class="comment-content" v-html="text" v-show="open"></div>
    <ul class="child-comments" v-if="kids" v-show="open">
      <li v-repeat="comments" v-component="comment"></li>
    </ul>
  </li>
</template>

<script>
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      open: true,
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
}
</script>