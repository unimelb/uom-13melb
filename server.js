var directory = require("./directory");
var express = require("express");
var neo4j = require("neo4j");
var http = require("http");
var airbrake = require("airbrake");

var app = express();

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Content-Type", "application/json");
  next();
 });

var airbrake = require('airbrake').createClient("ddbfe232e617465432f2197edc683d7d");
app.use(airbrake.expressHandler());

app.listen(80);

var server = new neo4j.GraphDatabase(
	"http://app25709970:Syd0SMD3fm7GPkeOQ9W4@app25709970.sb02.stations.graphenedb.com:24789"
);

var dir = new directory.Directory(server);

/**
 * Area
 */

var send_json = function (res, object) {
	var recursive_delete = function(structure, property) {
		delete structure[property];
		Object.keys(structure).forEach(function (key) {
			if (structure[key] instanceof Object) {
				recursive_delete(structure[key], property);
			}
		});
	}
	recursive_delete(object, "directory");
	res.send(JSON.stringify(object));
}

app.param("area", function(req, res, next, id) {
	if (id == "root") {
		req.area = dir.root_area();
	} else {
		req.area = dir.area(id);
	}
	next();
});

app.get("/", function (req, res) {
	res.send("{}");
});

app.get("/area/:area", function (req, res) {
	req.area.then(function (area) {
		send_json(res, area);
	});
});

app.get("/area/:area/children", function (req, res) {
	req.area.then(function (area) { return area.children(); }).then(function (area) {
		send_json(res, area);
	});
});

app.get("/area/:area/parent", function (req, res) {
	req.area.then(function (area) { return area.parent(); }).then(function (area) {
		send_json(res, area);
	});
});

// ?q=query
app.get("/area/:area/search", function (req, res) {
	req.area.then(function (area) {
		area.search(decodeURIComponent(req.query.q)).then(function (area) {
			send_json(res, area);
		});
	});
});

app.get("/area/:area/all_contacts", function (req, res) {
	req.area.then(function (area) { return area.all_contacts(); }).then(function (result) {
		send_json(res, result);
	});
});

/**
 * Collection
 */


