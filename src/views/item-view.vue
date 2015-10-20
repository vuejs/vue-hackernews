<template>
  <div class="item-view" v-show="item">
    <item :item="item"></item>
    <ul class="poll-options" v-if="pollOptions">
      <li v-for="option in pollOptions">
        <p>{{option.text}}</p>
        <p class="subtext">{{option.score}} points</p>
      </li>
    </ul>
    <ul class="comments" v-if="comments">
      <comment
        v-for="comment in comments"
        :comment="comment">
      </comment>
    </ul>
    <p v-show="!comments.length">No comments yet.</p>
  </div>
</template>

<script>
import store from '../store'
import Item from '../components/item.vue'
import Comment from '../components/comment.vue'

export default {
  components: {
    item: Item,
    comment: Comment
  },
  data () {
    return {
      item: {},
      pollOptions: null,
      comments: []
    }
  },
  route: {
    data ({ to }) {
      this.load(to.params.id)
    }
  },
  methods: {
    load (id) {
      store.fetchItem(id, (item) => {
        this.item = item
        this.fetchComments()
        if (item.type === 'poll') {
          this.fetchPollOptions()
        }
      })
    },
    fetchComments () {
      store.fetchItems(this.item.kids, (comments) => {
        this.comments = comments
      })
    },
    fetchPollOptions () {
      store.fetchItems(this.item.parts, (options) => {
        this.pollOptions = options
      })
    }
  }
}
</script>

<style lang="stylus">
@import "../shared.styl"
.item-view
  .item
    padding-left 0
    margin-bottom 30px
    .index
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
