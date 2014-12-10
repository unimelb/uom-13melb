q = require 'q'

Directory = require './directory'
Area = require './area'
Collection = require './collection'
Contact = require './contact'

module.exports = class API

  constructor: (@server) ->

  directory: -> new Directory @server, this
  area: (id) -> q new Area id, @server, this
  collection: (id) -> q new Collection id, @server, this
  contact: (id) -> q new Contact id, @server, this
  area_result: (id, info) -> Area.result id, info