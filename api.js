"use strict";

var neo4j = require("neo4j");
var q = require("q");
var util = require("util");

//var server = new neo4j.GraphDatabase("http://localhost:7474");

/**
 * Directory
 */

var Directory = function (server) {
	this.server = server;
}

Directory.prototype.root_area = function () {
	var dir = this;
	var query = [
		"MATCH (root:Area)",
		"WHERE NOT ()-[:PARENT_OF]->(root)",
		"RETURN root"
	].join(" ");
	var deferred = q.defer();
	this.server.query(query, {}, function (err, results) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var node = results[0]["root"]; // should only be one result
		var data = node.data;
		var area = new Area(dir, node.id, data);
		deferred.resolve(area);
		return;
	});
	return deferred.promise;
}

Directory.prototype.area = function (area_id) {
	var dir = this;
	var deferred = q.defer();
	this.server.getNodeById(area_id, function (err, node) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var data = node.data;
		var area = new Area(dir, node.id, data);
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

Area.prototype.descend_along_path = function (path) {
	var area = this;
	var deferred = q.defer();

	var query = ["START n=node({root_area_id}) MATCH (n)"];
	var params = {"root_area_id" : this.get_area_id()};
	path.forEach(function (area_name, depth) {
		query.push(util.format(
			"-[:PARENT_OF]->(x%d:Area { name: \"%s\"})",
			depth, area_name
		));
	});
	var result_node_name = util.format("x%d", path.length - 1);
	query.push(util.format("RETURN %s", result_node_name));
	var query_string = query.join(" ");

	area.directory.server.query(query_string, params,
		function (err, target_node) {
			if (err) {
				deferred.reject(err);
				throw err;
			}
			var target = target_node[0][result_node_name];
			var target_area = new Area(
				area.directory, target.id, target.data
			);
			deferred.resolve(target_area);
		}
	);
	return deferred.promise;
}

Area.prototype.parent = function () {
	var area = this;
	var query = [
		"START n=node({area_id})",
		"MATCH (parent:Area)-[:PARENT_OF]->(n)",
		"RETURN parent"
	].join(" ");
	var params = {"area_id" : this.area_id};
	var deferred = q.defer();
	this.directory.server.query(query, params, function (err, parents) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var parent = parents[0]["parent"];
		var parent_area = new Area(area.directory, parent.id, parent.data);
		deferred.resolve(parent_area);
	});
	return deferred.promise;
}

Area.prototype.children = function () {
	var area = this;
	var query = [
		"START n=node({area_id})",
		"MATCH (n)-[:PARENT_OF]->(child:Area)",
		"RETURN child"
	].join(" ");
	var params = {"area_id" : this.area_id};
	var deferred = q.defer();
	this.directory.server.query(query, params, function (err, child_nodes) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var children = child_nodes.map(function (child_node) {
			var child_area = child_node["child"];
			return new Area(area.directory, child_area.id, child_area.data);
		});
		deferred.resolve(children);
	});
	return deferred.promise;
}

Area.prototype.search = function (search_str) {
	var area = this;
	var query = [
		"START n=node({area_id})",
		"MATCH (n)-[:PARENT_OF*]->(target:Area)",
		util.format("WHERE target.name =~ \"(?i).*%s.*\"", search_str),
		"RETURN target"
	].join(" ");
	var params = {"area_id" : this.area_id};
	var deferred = q.defer();
	this.directory.server.query(query, params, function (err, results) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var result_areas = results.map(function (result) {
			var result_area = result["target"];
			return new Area(area.directory, result_area.id, result_area.data);
		});
		deferred.resolve(result_areas);
	});
	return deferred.promise;
}

Area.prototype.collections = function () {

}

Area.prototype.get_area_id = function () {
	return this.area_id;
}

Area.prototype.get_name = function () {
	return this.name;
}

Area.prototype.get_notes = function () {
	return this.notes;
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

/*var query_results_to_areas = function (directory, results, node_name) {
	return results.map(function (result) {
		var result_area = result[node_name];
		return new Area(directory, result_area.id, result_area.data);
	});
}*/