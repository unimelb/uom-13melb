neo4j = require 'neo4j'
express = require 'express'
bodyParser = require 'body-parser'

API = require './src/api'

server = new neo4j.GraphDatabase process.env.GRAPHENEDB_URL
directory = new API(server).directory()

app = express()
app.listen process.env.PORT or 5000;
console.log "Listening on port " + (process.env.PORT or 5000);

app.use bodyParser.json extended: true

app.all '*', (req, res, next) =>
  res.header 'Access-Control-Allow-Origin', '*'
  res.header 'Access-Control-Allow-Headers', 'X-Requested-With'
  res.header 'Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE'
  next()

app.param 'area', (req, res, next, id) ->
  (if id == 'root' then directory.root_area()
  else directory.area(id)).then (area) ->
    req.area = area
    next()

app.param 'group', (req, res, next, id) ->
  directory.collection(id).then (group) ->
    req.group = group
    next()

app.param 'contact', (req, res, next, id) ->
  directory.contact(id).then (contact) ->
    req.contact = contact
    next()

#
# All /area... endpoints
#

# Basic GPPD endpoints

app.get '/area', (req, res, next) ->
  directory.all_areas().then (areas) ->
    res.json areas
    next()

app.get '/area/:area', (req, res, next) ->
  req.area.self().then (area) ->
    res.json area
    next()

app.put '/area/:area', (req, res, next) ->
  req.area.update(req.body).then (area) ->
    res.json area
    next()

app.post '/area/:area', (req, res, next) ->
  req.area(req.body.parent).then (area) ->
    area.new_child(req.body)
  .then (area) ->
    res.json area
    next()

app.delete '/area/:area', (req, res, next) ->
  if true
    res.json error: '
      The ability to delete areas has been disabled.
      To detach an area, update it to remove the parent attribute.'
    next()
  else
    req.area.destroy().then (area) ->
      res.json area
      next()
    .catch (err) ->
      res.json err
      next()

# Special helper endpoints to fetch multiple areas at once

app.get '/area/:area/path', (req, res, next) ->
  req.area.path().then (areas) ->
    res.json areas
    next()

app.get '/area/:area/children', (req, res, next) ->
  req.area.children().then (areas) ->
    res.json areas
    next()

app.get '/area/:area/descendents', (req, res, next) ->
  req.area.descendents().then (areas) ->
    res.json areas
    next()

app.get '/area/:area/search', (req, res, next) ->
  req.area.search(req.query.q).then (areas) ->
    res.json areas
    next()

#
# All /group... endpoints
#

# ?area= for area
app.get '/group', (req, res, next) ->
  directory.area(req.query.area).contacts().then (groups) ->
    res.json groups
    next()

app.get '/group/:group', (req, res, next) ->

# for changing / creating a parent relationship
# note is thus on child group
app.put '/group/:group'

# cannot create / delete - creating done through contacts, delete when all
# contacts are gone.

#
# All /contact... endpoints
#

# Basic GPPD

app.get '/contact'

app.get '/contact/:contact'
 
# collection present: in that collection
# no collection: create new collection
# always state area
app.post '/contact'

# similar to post semantics
app.put '/contact'