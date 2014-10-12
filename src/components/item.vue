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

<template>
  <span class="index">{{index}}.</span>
  <p>
    <a class="title" href="{{href}}" target="_blank">{{title}}</a>
    <span class="domain" v-show="showDomain">
      ({{url | domain}})
    </span>
  </p>
  <p class="subtext">
    <span v-show="showInfo">
      {{score}} points by
      <a href="#/user/{{by}}">{{by}}</a>
    </span>
    {{time | fromNow}} ago
    <span class="comments-link" v-show="showInfo">
      | <a href="#/item/{{id}}">comments</a>
    </span>
  </p>
</template>

<script>
module.exports = {
  computed: {
    index: function () {
      if (this.$parent.displayPage) {
        return (this.$parent.displayPage - 1) * 30 + this.$index + 1
      }
    },
    href: function () {
      return this.url || ('#/item/' + this.id)
    },
    showInfo: function () {
      return this.type === 'story' || this.type === 'poll'
    },
    showDomain: function () {
      return this.type === 'story'
    },
    highlighted: function () {
      return this.$root.inspectedStory.id === this.id
    }
  }
}
</script>