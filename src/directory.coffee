q = require 'q'

util = require './util'

module.exports = class Directory

  @result: (id, info) ->
    info.id = id
    info

  constructor: (@server, @factory) ->

  properties: -> []

  area: (area_id) ->
    @factory.area parseInt(area_id)

  collection: (collection_id) ->
    @factory.collection parseInt(collection_id)

  contact: (contact_id) ->
    @factory.contact parseInt(contact_id)

  root_area: ->
    @query '
      MATCH (root:Area)
      WHERE root.is_root = true
      RETURN root',
    (result, others...) =>
      @area result.root.id

  all_areas: ->
    @query '
      MATCH (area:Area)
      OPTIONAL MATCH (parent:Area)-[:PARENT_OF]->(area)
      RETURN parent, area',
    (results...) =>
      results.map (result) =>
        @factory.area_result(
          result.area.id,
          (if result.parent
            util.extend result.area.data, parent: result.parent.id
          else
            result.area.data)
        )

  query: (query_str, process_results, params = {}) ->
    deferred = q.defer()
    console.log query_str
    @server.query query_str, params, (err, results) ->
      if err
        console.error err
        deferred.reject err
        throw err
      processed_results = process_results results...
      deferred.resolve processed_results
    deferred.promise

  _filter: (object) ->
    Object.keys(object).forEach (key) =>
      delete object[key] if key not in @properties()
    object