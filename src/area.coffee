Directory = require './directory'
Collection = require './collection'
Contact = require './contact'
util = require './util'

console.log Directory

module.exports = class Area extends Directory

  constructor: (@area_id, other...) ->
    super other...

  properties: -> ['name', 'note']

  self: ->
    @query '
      START area=node({area_id})
      OPTIONAL MATCH (parent:Area)-[:PARENT_OF]->(area)
      RETURN parent, area',
    (result, others...) =>
      data = result.area.data
      data.parent = if result.parent then result.parent.id else null
      Area.result result.area.id, data
    , area_id: @area_id

  path: ->
    @_std_query '
      START n=node({area_id})
      MATCH (area:Area)-[:PARENT_OF*0..]->(n)
      OPTIONAL MATCH (parent:Area)-[:PARENT_OF]->(area)
      RETURN parent, area'

  children: ->
    @_std_query '
      START parent=node({area_id})
      MATCH (parent)-[:PARENT_OF]->(area:Area)
      RETURN parent, area'

  descendents: ->
    @_std_query '
      START n=node({area_id})
      MATCH (n)-[:PARENT_OF*0..]->(area:Area)
      MATCH (parent:Area)-[:PARENT_OF]->(area)
      RETURN parent, area'

  search: (q) ->
    q = q.toLowerCase().trim().replace(/\s+/g, ' ').split ' '
    disjunct = "(?i).*(^| )(#{q.join '|'}).*"
    lookahead = "(?i)^#{q.reduce ((acc, s) -> "#{acc}(?=.*( |^)#{s})"), ''}.+"
    @query "
      START n=node({area_id})
      MATCH p = (n)-[:PARENT_OF*]->(area:Area)
      WHERE area.name =~ '#{disjunct}'
      AND REDUCE(pstr = '', r in nodes(p) | pstr + r.name + ' ') =~ '#{lookahead}'
      MATCH (parent:Area)-[:PARENT_OF]->(area)
      RETURN parent, area, REDUCE(pstr = '', r in nodes(p) | pstr + id(r) + ' ') AS path
      ORDER BY LENGTH(p) DESC",
    (results...) ->
      seen = {}
      results.reduce (acc, result) ->
        return acc if !!seen[result.area.id]
        result.path.split(' ').forEach (area_id) -> seen[area_id] = true
        acc.concat Area.result(
          result.area.id,
          util.extend result.area.data, parent: result.parent.id
        )
      , []
    , area_id: @area_id

  contacts: ->
    @query '
      START n=node({area_id})
      MATCH (n)<-[:RESPONSIBLE_FOR]-(group:Collection)
        ,(group)<-[:IN_COLLECTION]-(contact:Contact)
      OPTIONAL MATCH (parent:Collection)-[:COMES_BEFORE]-(group)
      RETURN group, contact, parent',
    (results...) =>
      groups = {}
      results.forEach (result) =>
        group_id = result.group.id
        if !groups[group_id]
          groups[group_id] = util.extend Collection.result(group_id, result.group.data), contacts: []
          util.extend groups[group_id], parent: result.parent.id if result.parent
        groups[group_id].contacts.push(
          Contact.result result.contact.id,
            extend result.contact.data, group: group_id, area: @area_id)
      Object.keys(groups).map (key) -> groups[key]
    , area_id: @area_id

  #
  # Mutators
  #

  set_parent: (parent_id) ->
    @query "
      START n=node({area_id}), #{if parent_id then 'parent=node({parent_id})' else ''}
      MATCH (old_parent:Area)-[link:PARENT_OF]->(n) DELETE link
      #{if parent_id then 'CREATE (parent)-[:PARENT_OF]->(n)' else ''}
      RETURN n",
    (result, others...) ->
      Area.result result.n.id, util.extend result.n.data, parent: parent_id
    , area_id: @area_id, parent_id: parseInt(parent_id)

  update: (info) ->
    info.parent = null if !info.parent
    @self().then (self) =>
      if info.parent != self.parent then @set_parent info.parent else q self
    .then (self) =>
      @query '
        START area=node({area_id})
        SET area = {props}
        RETURN area',
      (result, others...) =>
        Area.result result.area.id, util.extend(result.area.data, parent: self.parent)
      , area_id: @area_id, props: @_filter info

  new_child: (info) ->
    @query '
      START parent=node({area_id})
      CREATE (area:Area {props}), (parent)-[:PARENT_OF]->(area)
      RETURN area',
    (result, others...) =>
      Area.result result.area.id, util.extend(result.area.data, parent: @area_id)
    , area_id: @area_id, props: @_filter info

  destroy: ->
    @self().then (self) =>
      if self.is_root
        q.reject {error: 'Cannot delete root area.'}
      else
        @query '
          START n=node({area_id})
          OPTIONAL MATCH (n)<-[group_link:RESPONSIBLE_FOR]-(group:Collection)
          OPTIONAL MATCH (group)-[group_group:COMES_BEFORE]->(:Collection)
          OPTIONAL MATCH (group)<-[contact_link:IN_COLLECTION]-(:Contact)
          DELETE group_link, group_group, contact_link
          DELETE n, group',
        (-> self), area_id: @area_id

  # private

  _std_query: (query) ->
    @query query, (results...) =>
      results.map (result) =>
        Area.result(
          result.area.id,
          (if result.parent
            util.extend result.area.data, parent: result.parent.id
          else
            result.area.data)
        )
    , area_id: @area_id