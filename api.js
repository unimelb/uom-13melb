var neo4j = require("neo4j");
var q = require("q");

//var server = new neo4j.GraphDatabase("http://localhost:7474");

/**
 * Directory
 */

var Directory = function (server) {
	this.server = server;
}

Directory.prototype.root_area = function () {
	var query = [
		"MATCH (root:Area)",
		"WHERE NOT ()-[:PARENT_OF]->(root)",
		"RETURN root"
	].join(" ");
	var deferred = q.defer();
	this.server.query(query, {}, function (err, results) {
		if (err) {
			deferred.reject(err);
			return;
		}
		var node = results[0]["root"]; // should only be one result
		var data = node.data;
		var area = new Area(this, node.id, data);
		deferred.resolve(area);
		return;
	});
	return deferred.promise;
}

Directory.prototype.area = function (area_id) {
	var deferred = q.defer();
	this.server.getNodeById(area_id, function (err, node) {
		if (err) {
			deferred.reject(err);
			return;
		}
		var data = node.data;
		var area = new Area(this, node.id, data);
		deferred.resolve(area);
		return;
	});
	return deferred.promise;
}

exports.Directory = Directory;

/**
 * Area
 */

var Area = function (dir, area_id, area_info) {
	this.directory = dir;
	this.area_id = area_id;
	this.name = area_info.name;
	if (area_info.notes !== undefined) this.notes = area_info.notes;
}

Area.prototype.descend_along_path = function () {

}

Area.prototype.children = function (area) {
	var query = [
		"START n=node({area_id})",
		"MATCH (n)-[:PARENT_OF]->(m:Area)",
		"RETURN m"
	].join(" ");
	var params = {"area_id" : area.area_id};
	var deferred = q.defer();
	this.directory.server.query(query, params, function (err, child_nodes) {
		if (err) {
			deferred.reject(err);
			return;
		}
		var children = child_nodes.map(function (child_node) {
			return new Area(this.directory, child_node.id, child_node.data);
		});
		deferred.resolve(children);
	});
	return deferred.promise;
}

Area.prototype.descendents = function () {

}

Area.prototype.filter = function () {
	
}

Area.prototype.collections = function () {

}

exports.Area = Area;

/**
 * Collection
 */

var Collection = function () {

}

exports.Collection = Collection;

/**
 * Contact
 */

var Contact = function () {

}

exports.Contact = Contact;