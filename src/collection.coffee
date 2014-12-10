Directory = require './directory'
util = require './util'

module.exports = class Collection extends Directory

  constructor: (@collection_id, other...) ->
    super other

  self: ->
    @info ||= @query '
      START collection=node({collection_id})
      MATCH (collection)<-[:IN_COLLECTION]-(contact:Contact)
      OPTIONAL MATCH (parent:Collection)-[:COMES_BEFORE]->(collection)
      RETURN collection, contact, parent',
    (results...) ->
      info = results[0].collection.data
      util.extend info, parent: results[0].parent.id if results[0].parent
      util.extend info, contacts: results.map (result) ->
        Collection.result result.contact.id, result.contact.info
      Collection.result @collection_id, info