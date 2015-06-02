<style lang="stylus">
.user-view
  color $gray
  li
    margin 5px 0
  .label
    display inline-block
    min-width 60px
  .about
    margin-top 1em
  .links a
    text-decoration underline
</style>

<template>
  <div class="user-view" v-show="user">
    <ul>
      <li><span class="label">user:</span> {{user.id}}</li>
      <li><span class="label">created:</span> {{user.created | fromNow}} ago</li>
      <li><span class="label">karma:</span> {{user.karma}}</li>
      <li>
        <span class="label">about:</span>
        <div class="about" v-html="user.about"></div>
      </li>
    </ul>
    <p class="links">
      <a href="https://news.ycombinator.com/submitted?id={{user.id}}">submissions</a><br>
      <a href="https://news.ycombinator.com/threads?id={{user.id}}">comments</a>
    </p>
  </div>
</template>

<script>
var store = require('../store')

module.exports = {
  replace: true,
  props: ['params'],
  data: function () {
    return {
      params: {
        userId: null
      },
      user: {}
    }
  },
  watch: {
    'params.userId': 'update'
  },
  compiled: function () {
    this.update()
  },
  methods: {
    update: function () {
      store.fetchUser(this.params.userId, function (user) {
        this.user = user
      }.bind(this))
    }
  }
}
</script>
