var parser = document.createElement('a')

module.exports = function (url) {
  parser.href = url
  return parser.hostname
}