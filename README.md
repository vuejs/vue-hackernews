# Vue.js HackerNews clone

[Live demo](http://yyx990803.github.io/vue-hackernews/)

Built with [Vue.js](http://vuejs.org) and the official [HackerNews API](https://github.com/HackerNews/API), with pagination, comments, user profile, realtime updates, responsive layout.

Vue.js & Firebase are the only libraries used, the app itself totals ~140 SLOC JavaScript excluding comments.

## Notes

- I've intentionally avoided using build tools because the whole thing is pretty simple.

- The HN API currently only provides the top 100 stories, hence there are only 4 pages available.

- The HN API doesn't provide the recursive comments count for each story, so it's not displayed.

- There's no login functionality, i.e. it's view-only mode.