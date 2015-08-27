<template>
  <li v-show="comment.text">
    <div class="comhead">
      <a class="toggle" v-on="click: open = !open">{{open ? '[-]' : '[+]'}}</a>
      <a href="#/user/{{comment.by}}">{{comment.by}}</a>
      {{comment.time | fromNow}} ago
    </div>
    <div class="comment-content" v-show="open">
      {{{comment.text}}}
    </div>
    <ul class="child-comments" v-if="comment.kids" v-show="open">
      <comment v-for="comment in childComments" comment="{{comment}}"></comment>
    </ul>
  </li>
</template>

<script>
var store = require('../store')

module.exports = {
  name: 'comment', // for recursively using self
  props: {
    comment: Object
  },
  data: function () {
    return {
      childComments: [],
      open: true
    }
  },
  created: function () {
    if (this.comment.kids) {
      store.fetchItems(this.comment.kids, function (comments) {
        this.childComments = comments
      }.bind(this))
    }
  }
}
</script>

<style lang="stylus">
@import "../shared.styl"

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
  code
    white-space pre-wrap

.child-comments
  margin 8px 0 8px 22px
</style>
