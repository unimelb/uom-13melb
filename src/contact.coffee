Directory = require './directory'

module.exports = class Contact extends Directory

  constructor: (@contact_id, other...) ->
    super other...