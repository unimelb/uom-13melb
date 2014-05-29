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

	return promise_query(this.server,
		[
			"MATCH (root:Area)",
			"WHERE NOT ()-[:PARENT_OF]->(root)",
			"RETURN root"
		],
		{},
		function (results) {
			var node = results[0]["root"]; // should only be one result
			return new Area(dir, node.id, node.data);
		}
	);
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

	// construct query
	var query = ["START n=node({root_area_id}) MATCH (n)"];
	path.forEach(function (area_name, depth) {
		query.push(util.format(
			"-[:PARENT_OF]->(x%d:Area { name: \"%s\"})",
			depth, area_name
		));
	});
	var result_node_name = util.format("x%d", path.length - 1);
	query.push(util.format("RETURN %s", result_node_name));

	return promise_query(this.directory.server,
		query, {"root_area_id" : this.get_area_id()},
		function (target_node) {
			var target = target_node[0][result_node_name];
			return new Area(
				area.directory, target.id, target.data
			);
		}
	);
}

Area.prototype.parent = function () {
	var area = this;

	return promise_query(
		this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (parent:Area)-[:PARENT_OF]->(n)",
			"RETURN parent"
		],
		{"area_id" : this.area_id},
		function (parents) {
			var parent = parents[0]["parent"];
			return new Area(area.directory, parent.id, parent.data);
		}
	);
}

Area.prototype.children = function () {
	var area = this;

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)-[:PARENT_OF]->(child:Area)",
			"RETURN child"
		],
		{"area_id" : this.area_id},
		function (child_nodes) {
			return child_nodes.map(function (child_node) {
				var child_area = child_node["child"];
				return new Area(
					area.directory, child_area.id, child_area.data
				);
			});
		}
	);
}

Area.prototype.search = function (search_str) {
	var area = this;

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)-[:PARENT_OF*]->(target:Area)",
			util.format("WHERE target.name =~ \"(?i).*%s.*\"", search_str),
			"RETURN target"
		],
		{"area_id" : this.area_id},
		function (results) {
			return results.map(function (result) {
				var result_area = result["target"];
				return new Area(
					area.directory, result_area.id, result_area.data
				);
			});
		}
	);
}

Area.prototype.collections = function () {
	var area = this;

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (collection:Collection)-[:RESPONSIBLE_FOR*]->(n)",
			"WHERE NOT ()-[:COMES_BEFORE]->(collection)",
			"RETURN collection"
		],
		{"area_id" : this.area_id},
		function (results) {
			return results.map(function (result) {
				var collection = result["collection"];
				return new Collection(
					area.directory, collection.id
				);
			});
		}
	);
}

Area.prototype.all_contacts = function () {
	var area = this;
	/*var expand = function (collections) {
		var deferred = q.defer();
		q.all(collections.map(function (collection) {
			console.log("collections");
			//console.log(collection);
			return q.all([collection.contacts(), collection.successors()]);
		})).then(function (results) {
			console.log("contacts/successors");
			return q.all(results.map(function (contacts_succs) {
				var contacts = contacts_succs[0];
				var successors = contacts_succs[1];
				console.log(contacts);
				console.log(successors);
				var successors_promise;
				if (!successors.length) {
					var deferred = q.defer();
					successors_promise = deferred.promise();
					deferred.resolve([]);
				} else {
					successors_promise = expand(successors);
				}
				return q.all([
					successors_promise,
					q.all(contacts.map(function (contact) {
						return contact.refresh();
					}))
				]);
			}));
		}).then(function (results) {
			console.log("resolving");
			var collection = results.map(function (contacts_succs) {
				return {
					"successors" : contacts_succs[0],
					"contacts" : contacts_succs[1]
				};
			});
			deferred.resolve(collection);
		});
		return deferred.promise();
	};
	return this.collections().then(expand);*/

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)<-[:RESPONSIBLE_FOR]-(c:Collection)",
			"MATCH (contact:Contact)-[:IN_COLLECTION]->(c)",
			"OPTIONAL MATCH (c)-[succ:COMES_BEFORE]->(c2:Collection)",
			"RETURN contact,c,succ,c2"
		],
		{"area_id" : this.area_id},
		function (results) {

			var contacts = [];
			var all_contacts = {};
			var parent = {};
			results.forEach(function (result) {
				var coll_id = result["c"].id;
				if (!(coll_id in all_contacts)) {
					all_contacts[coll_id] = {
						contacts : [],
						successors : []
					};

					if (result["c2"] != null) {
						parent[result["c2"].id] = {
							"parent" : result["c"].id,
							"note" : result["succ"].data.note
						};
					}
				}
				all_contacts[coll_id].contacts.push(
					new Contact(
						area.directory,
						result["contact"].id,
						result["contact"].data
					)
				);

			});

			Object.keys(all_contacts).forEach(function (coll) {
				if (!(coll in parent)) {
					contacts.push(all_contacts[coll]);
				} else {
					all_contacts[parent[coll].parent].successors.push({
						"collection" : all_contacts[coll],
						"note" : parent[coll].note
					});
				}
			});

			return contacts;
		}
	);
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

var Collection = function (directory, collection_id) {
	this.directory = directory;
	this.collection_id = collection_id;
}

Collection.prototype.contacts = function () {
	var collection = this;

	return promise_query(this.directory.server,
		[
			"START n=node({collection_id})",
			"MATCH (contact:Contact)-[:IN_COLLECTION]->(n)",
			"RETURN contact",
			"ORDER BY contact.last_name, contact.first_name"
		],
		{"collection_id" : this.collection_id},
		function (results) {
			return results.map(function (result) {
				var contact = result["contact"];
				return new Contact(
					collection.directory, contact.id, contact.data
				);
			});
		}
	);
}

Collection.prototype.successors = function () {
	var collection = this;

	return promise_query(this.directory.server,
		[
			"START n=node({collection_id})",
			"MATCH (n)-[link:COMES_BEFORE]->(succ:Collection)",
			"RETURN succ, link"
		],
		{"collection_id" : this.collection_id},
		function (results) {
			return results.map(function (result) {
				return new Collection(
					collection.directory, result["succ"].id
				);
			})
		}
	);
}

exports.Collection = Collection;

/**
 * Contact
 */

var Contact = function (directory, contact_id, contact_info) {

	this.directory = directory;
	this.contact_id = contact_id;
	this.contact_info = contact_info;
}

Contact.prototype.refresh = function () {
	var contact = this;
	return promise_query(this.directory.server,
		[
			"START n=node({contact_id})",
			"MATCH (n)-[:HAS_URL]->(url:Url)",
			"RETURN url"
		],
		{"contact_id" : this.contact_id},
		function (results) {
			if (results.length) {
				var url = results[0]["url"];
				contact.url = url.data;
			}
			return contact;
		}
	);
}

/*(Contact.prototype.working_times = function () {

}*/

Contact.prototype.get_contact_id = function () {
	return this.contact_id;
}

Contact.prototype.get_info = function () {
	return this.contact_info;
}

exports.Contact = Contact;

/**
 * Patterns
 */

var promise_query = function (server, query, params, process_results) {
	var query_str = query.join(" ");
	var deferred = q.defer();
	server.query(query_str, params, function (err, results) {
		if (err) {
			deferred.reject(err);
			throw err;
		}
		var processed_results = process_results(results);
		deferred.resolve(processed_results);
	});
	return deferred.promise;
}