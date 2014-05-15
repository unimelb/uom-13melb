var neo4j = require("neo4j");

//var server = new neo4j.GraphDatabase("http://localhost:7474");

/**
 * Directory
 */

var Directory = function (server) {
	this.server = server;
}

Directory.prototype.root_area = function () {
	var query = "
		MATCH (root:Area)
		WHERE NOT ()-[:PARENT_OF]->(root)
		RETURN x
	";
	this.server.query(query, {}, function (err, results) {

	});
}

/**
 * Area
 */

var Area = function(area_id) {

}

Area.prototype.descend_along_path = function () {

}

Area.prototype.children = function () {

}

Area.prototype.descendents = function () {

}

Area.prototype.filter = function () {
	
}

Area.prototype.collections = function () {

}

/**
 * Collection
 */

var Collection = function () {

}

/**
 * Contact
 */

var Contact = function () {

}