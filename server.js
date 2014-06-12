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

var airbrake = require('airbrake').createClient(process.env.AIRBRAKE_API_KEY);
app.use(airbrake.expressHandler());

var server = new neo4j.GraphDatabase(process.env.GRAPHENEDB_URL);

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
	res.json(object);
}

app.param("area", function (req, res, next, id) {
	var promise;
	if (id == "root") {
		promise = dir.root_area();
	} else {
		promise = dir.area(id);
	}
	promise.then(
		function (area) {
			req.area = area;
			next();
		},
		function (err) {
			res.send({error: "No area."});
			req.area = null;
		}
	);
});

app.get("/", function (req, res, next) {
	res.send("{}");
});

app.get("/area/:area", function (req, res, next) {
	if (req.area) {
		send_json(res, req.area);
	}
		next();
});

app.get("/area/:area/children", function (req, res, next) {
	if (req.area) {
		req.area.children().then(function (area) {
			send_json(res, area);
			next();
		});
	} else next();
});

app.get("/area/:area/descendents", function (req, res, next) {
	if (req.area) {
		req.area.descendents().then(function (area) {
			send_json(res, area);
			next();
		})
	} else next();
});

app.get("/area/:area/path", function (req, res, next) {
	if (req.area) {
		req.area.path(req.query.base).then(function (area) {
			send_json(res, area);
			next();
		});
	} else next();
})

app.get("/area/:area/parent", function (req, res, next) {
	if (req.area) {
		req.area.parent().then(function (area) {
			send_json(res, area);
			next();
		});
	} else next();
});

// ?q=query
app.get("/area/:area/search", function (req, res, next) {
	if (req.area) {
		req.area.search(decodeURIComponent(req.query.q)).then(function (area) {
			send_json(res, area);
			next();
		});
	} else next();
});

app.get("/area/:area/all_contacts", function (req, res, next) {
	if (req.area) {
		req.area.all_contacts().then(function (result) {
			send_json(res, result);
			next();
		});
	} else next();
});

app.get("/area/:area/descendent_contact_count", function (req, res, next) {
	if (req.area) {
		req.area.descendent_contact_count().then(function (result) {
			send_json(res, result);
			next();
		});
	} else next();
});

app.listen(process.env.PORT || 5000);
console.log("Listening on port " + (process.env.PORT || 5000));

