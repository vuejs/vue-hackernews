<template>
  <div class="item">
    <span class="index">{{index}}.</span>
    <p>
      <a class="title" href="{{href}}" target="_blank">{{item.title}}</a>
      <span class="domain" v-show="showDomain">
        ({{item.url | domain}})
      </span>
    </p>
    <p class="subtext">
      <span v-show="showInfo">
        {{item.score}} points by
        <a href="#/user/{{item.by}}">{{item.by}}</a>
      </span>
      {{item.time | fromNow}} ago
      <span class="comments-link" v-show="showInfo">
        | <a href="#/item/{{item.id}}">{{item.descendants}} comments</a>
      </span>
    </p>
  </div>
</template>

<script>
module.exports = {
  replace: true,
  props: ['page', 'item'],
  computed: {
    index: function () {
      if (this.page) {
        return (this.page - 1) * 30 + this.$index + 1
      }
    },
    href: function () {
      return this.item.url || ('#/item/' + this.item.id)
    },
    showInfo: function () {
      return this.item.type === 'story' || this.item.type === 'poll'
    },
    showDomain: function () {
      return this.item.type === 'story'
    }
  }
}
</script>

<style lang="stylus">
@import "src/shared.styl"

.item
  padding 2px 0 2px 40px
  position relative
  transition background-color .2s ease
  p
    margin 2px 0
  .title:visited
      color $gray
  .index
    color $gray
    position absolute
    width 30px
    text-align right
    left 0
    top 4px
  .domain, .subtext
    font-size 11px
    color $gray
    a
      color $gray
  .subtext a:hover
    text-decoration underline
</style>