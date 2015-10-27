<template>
  <div class="user-view" v-show="user">
    <ul>
      <li><span class="label">user:</span> {{user.id}}</li>
      <li><span class="label">created:</span> {{user.created | fromNow}} ago</li>
      <li><span class="label">karma:</span> {{user.karma}}</li>
      <li>
        <span class="label">about:</span>
        <div class="about">
          {{{user.about}}}
        </div>
      </li>
    </ul>
    <p class="links">
      <a :href="'https://news.ycombinator.com/submitted?id=' + user.id">submissions</a><br>
      <a :href="'https://news.ycombinator.com/threads?id=' + user.id">comments</a>
    </p>
  </div>
</template>

<script>
import store from '../store'

export default {

  name: 'UserView',

  data () {
    return {
      user: {}
    }
  },

  route: {
    data ({ to }) {
      // Promise sugar syntax: return an object that contains Promise fields.
      // http://router.vuejs.org/en/pipeline/data.html#promise-sugar
      return {
        user: store.fetchUser(to.params.id)
      }
    }
  }
}
</script>

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
