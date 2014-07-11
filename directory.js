"use strict";

var neo4j = require("neo4j");
var q = require("q");
var util = require("util");

//var server = new neo4j.GraphDatabase("http://localhost:7474");

/*var create_class = function (methods) {
	var prototype = "__init__" in methods ? methods.__init__ : function () { };
	Object.keys(methods).forEach(function (method) {
		if (method != "__init__") {
			prototype.prototype[method] = methods[method];
		}
	});
	return prototype;
}*/

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
			//"WHERE NOT ()-[:PARENT_OF]->(root)",
			"WHERE root.is_root = true",
			"RETURN root"
		],
		{},
		function (results) {
			var node = results[0]["root"]; // should only be one result
			var area = new Area(dir, node.id, node.data);
			area.is_root = true;
			return area;
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

Directory.orphan_areas = function () {
	return promise_query(
		[
			"MATCH (orphan:Area)",
			"WHERE root.is_root = false AND NOT ()-[:PARENT_OF]->(orphan)",
			"RETURN orphan"
		],
		{},
		function (results) {
			return results.map(function (result) {
				var area = result.orphan;
				return new Area(this.directory, area.id, area.data);
			}.bind(this));
		}.bind(this)
	);
}

Directory.prototype.collection = function (collection_id) {
	return q(new Collection(this, parseInt(collection_id)));
}

exports.Directory = Directory;

/**
 * Area
 */

var Area = function (dir, area_id, area_info) {
	this.directory = dir;
	this.area_id = area_id;
	this.name = area_info.name;
	if (area_info.note !== undefined) this.note = area_info.note;
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
			if (!parents.length) return null;
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
			"RETURN child ORDER BY child.name"
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

Area.prototype.descendents = function () {
	var area = this;

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)-[depth:PARENT_OF*]->(dp:Area)",
			"OPTIONAL MATCH (dp)-[:PARENT_OF]->(d:Area)",
			"RETURN d, depth, dp"
		],
		{"area_id" : this.area_id},
		function (descendents) {
			var tree_dict = {};
			tree_dict[area.area_id] = [];
			var area_dict = {};
			area_dict[area.area_id] = area;
			
			descendents.forEach(function (d) {
				var depth = d.depth.length;
				if (!d.d) {
					if (depth == 1) {
						tree_dict[area.area_id].push(d.dp.id);
						area_dict[d.dp.id] = new Area(area.directory, d.dp.id, d.dp.data);
					}
				} else {
					var depth = d.depth.length;
				
					if (depth == 1 && tree_dict[area.area_id].indexOf(d.dp.id) == -1) {
						tree_dict[area.area_id].push(d.dp.id);
						area_dict[d.dp.id] = new Area(area.directory, d.dp.id, d.dp.data);
					}

					if (!(d.dp.id in tree_dict)) {
						tree_dict[d.dp.id] = [];
					}
					tree_dict[d.dp.id].push(d.d.id);
					area_dict[d.d.id] = new Area(area.directory, d.d.id, d.d.data);
				}
			});
			var queue = [];
			var attach_descendents = function (node) {
				node.children = [];
				if (node.area.area_id in tree_dict) {
					tree_dict[node.area.area_id].forEach(function (child) {
						var new_area = {area: area_dict[child]};
						attach_descendents(new_area);
						node.children.push(new_area);
					});
				}
			}

			var root_node = {"area" : area};
			attach_descendents(root_node);

			return root_node;
		}
	);
}

Area.prototype.path = function (base_area_id) {
	var area = this;

	if (base_area_id) base_area_id = parseInt(base_area_id);

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			base_area_id ? ", base=node({base_area})" : "",
			"MATCH (m:Area)-[link:PARENT_OF*0..]->(n)",
			base_area_id
				? "WHERE (base)-[:PARENT_OF*0..]->(m)"
				: ""
			,
			"RETURN link, m, n"
		],
		{"area_id" : this.area_id, "base_area" : base_area_id},
		function (results) {
			var path = [];
			if (results.length) {
				path[0] = new Area(area.directory, results[0].n.id, results[0].n.data);
				results.forEach(function (result) {
					var pos = result.link.length;
					path[pos] = new Area(area.directory, result.m.id, result.m.data);
				});
			}
			return path.reverse()//.slice(1);
		}
	);
}

Area.prototype.search = function (search_str) {
	var area = this;
	search_str = search_str.toLowerCase().trim().replace(/ +/g, " ").split(" ");
	var search_regex = util.format("(%s)", search_str.join("|"));

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (m:Area)-[link:PARENT_OF*]->(target), (n:Area)-[:PARENT_OF*0..]->(m)",
			util.format("WHERE target.name =~ \"(?i).*(^| )%s.*\"", search_regex),
			"OPTIONAL MATCH (target)<--(:Collection)<-[*]-(c:Contact)",
			util.format("WHERE c.position =~ \"(?i).*(^| )%s.*\"", search_regex),
			"OPTIONAL MATCH (target)-[:PARENT_OF*]->()<-[*]-(a:Contact)",
			"RETURN target, link, m, COUNT(a), c",
			"UNION START n=node({area_id})",
			"MATCH (m:Area)-[link:PARENT_OF*]->(target)<--(:Collection)<-[*]-(c:Contact)",
			util.format("WHERE c.position =~ \"(?i).*(^| )%s.*\"", search_regex),
			"OPTIONAL MATCH (target)-[:PARENT_OF*]->()<-[*]-(a:Contact)",
			"RETURN target, link, m, COUNT(a), c"
		],
		{"area_id" : this.area_id},
		function (results) {
			if (!results) return [];
			var paths = {};
			var to_delete = [];
			results.forEach(function (result) {
				var a = result.target;
				paths[a.id] = [];
				paths[a.id][0] = new Area(area.directory, a.id, a.data);
				paths[a.id][0].descendent_contact_count = result["COUNT(a)"];
				if (result.c) {
					paths[a.id][0].matched_contact = new Contact(area.directory, result.c.id, result.c.data);
				}
			});
			results.forEach(function (result) {
				var distance = result.link.length;
				var target = result.target;
				var m = result.m;
				var matched_contact = null;

				// delete if part of path
				// but retain matched contact information
				if (m.id in paths) {
					matched_contact = paths[m.id][0].matched_contact || null;
					to_delete.push(m.id);
				}

				if (target.id in paths) {
					paths[target.id][distance] = new Area(
						area.directory, m.id, m.data
					);
					if (matched_contact) {
						paths[target.id][distance].matched_contact = matched_contact;
					}
				}
			});
			to_delete.forEach(function (key) {
				delete paths[key];
			});

			var result_list = [];
			Object.keys(paths).forEach(function (target_id) {
				result_list.push(paths[target_id].reverse().slice(1));
			});
			// further filtering
			var reduced = result_list.filter(function (path) {
				var position = path[path.length - 1].matched_contact
					? " " + path[path.length - 1].matched_contact.contact_info.position
					: "";
				var pathstr = (path.map(function (path_item) {
					return path_item.name + (path_item.matched_contact
						? " " + path_item.matched_contact.contact_info.position
						: ""
					);
				}).join(" ") + position).toLowerCase();
				console.log(pathstr);
				console.log(search_str);
				return search_str.every(function (term) {
					return pathstr.indexOf(term) > -1;
				});
			});

			return reduced;
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
			console.log(results);
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

	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)<-[:RESPONSIBLE_FOR]-(c:Collection)",
			"MATCH (contact:Contact)-[:IN_COLLECTION]->(c)",
			"OPTIONAL MATCH (contact)-[:HAS_URL]->(url:Url)",
			"OPTIONAL MATCH (c)-[succ:COMES_BEFORE]->(c2:Collection)",
			"RETURN contact,url,c,succ,c2"
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
						collection_id : coll_id,
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
						result["contact"].data,
						result["url"] ? result["url"].data : null
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

Area.prototype.descendent_contact_count = function () {
	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (n)-[:PARENT_OF*]->()<-[*]-(a:Contact)",
			"RETURN COUNT(a)"
		],
		{area_id : this.area_id},
		function (results) {
			return {"contacts" : results[0]["COUNT(a)"]};
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

Area.prototype.new_child = function (data) {
	console.log(data);
	if (typeof(data) == "string") data = {name: data};
	if (!("name" in data) || !data.name.length) return q(null);

	var params = {
		area_id : this.area_id,
		name : data.name
	};
	if (data.note) params.note = data.note;
	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"CREATE (new_area:Area {name: {name}",
			data.note ? ", note: {note}" : "",
			"}),",
			"(n)-[:PARENT_OF]->(new_area)",
			"RETURN (new_area)"
		],
		params,
		function (results) {
			var area = results[0].new_area;
			return new Area(this.directory, area.id, area.data);
		}.bind(this)
	);
}

// attempts to detach an area from its parent, returning the parent.
// if the node is already detached / is root, returns null
Area.prototype.detach = function () {
	if (this.is_root) return q({error : "cannot delete root"});
	else return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (parent:Area)-[area_area:PARENT_OF]->(n)",
			"DELETE area_area",
			"RETURN parent"
		],
		{area_id : this.area_id},
		function (results) {
			if (results.length) {
				var area = results[0].parent;
				return new Area(this.directory, area.id, area.data);
			} else return null;
		}.bind(this)

	);
}

// removes the area AND ALL DESCENDENTS. Cannot be done on root.
// returns parent
Area.prototype.remove = function () {
	if (this.is_root) return q({error : "cannot delete root"});
	else return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			"MATCH (parent:Area)-[child_link:PARENT_OF]->(n)-[desc_link:PARENT_OF*0..]->(m:Area)",
			"OPTIONAL MATCH (m)<-[coll_link:RESPONSIBLE_FOR]-(coll:Collection)",
			"OPTIONAL MATCH (coll)-[coll_coll:COMES_BEFORE]->(:Collection)",
			"OPTIONAL MATCH (coll)<-[contact_link:IN_COLLECTION]-(c:Contact)",
			"OPTIONAL MATCH (c)-[url_link:HAS_URL]->(url:Url)",
			"OPTIONAL MATCH (c)-[day_link:ONLY_WORKS]->(day:Day)",
			"FOREACH (l IN desc_link | DELETE l)",
			"DELETE child_link, coll_link, contact_link, url_link, day_link, coll_coll",
			"DELETE m, coll",
			"RETURN parent"
		],
		{area_id : this.area_id},
		function (results) {
			var area = results[0].parent;
			return new Area(this.directory, area.id, area.data);
		}.bind(this)

	);
}

Area.prototype.update = function (new_data) {
	var keys = intersect(["name", "note"], Object.keys(new_data));
	var set_clause = util.format("SET %s", keys.map(function (key) {
		this[key] = new_data[key];
		return util.format("n.%s = {%s}", key, key);
	}.bind(this)).join(","));
	new_data.area_id = this.area_id;
	return promise_query(this.directory.server,
		[
			"START n=node({area_id})",
			set_clause,
			"RETURN n"
		],
		new_data,
		function (results) {
			return this;
		}.bind(this)
	);
}

Area.prototype.change_parent = function (new_parent) {
	return this.detach().then(function () {
		return promise_query(this.directory.server,
			[
				"START n=node({area_id}), parent=node({parent_id})",
				"CREATE (parent)-[:PARENT_OF]->(n)",
				"RETURN n"
			],
			{area_id : this.area_id, parent_id : parseInt(new_parent.area_id)},
			function (results) {
				return this;
			}.bind(this)
		);
	}.bind(this));
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
			"OPTIONAL MATCH (contact)-[:HAS_URL]->(url:Url)",
			"RETURN contact, url",
			"ORDER BY contact.last_name, contact.first_name"
		],
		{"collection_id" : this.collection_id},
		function (results) {
			return results.map(function (result) {
				var contact = result["contact"];
				var url = result["url"];
				return new Contact(
					collection.directory, contact.id, contact.data, url ? url.data : null
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

// separate some contacts into a new collection, returning the new one
Collection.prototype.split = function (contacts) {
	var contact_list = "[" + contacts.map(function (contact) {
		return contact instanceof Object ? contact.contact_id : contact;
	}).join(",") + "]";
	return promise_query(this.directory.server,
		[
			"START old_collection=node({old_collection_id})",
			"MATCH (area:Area)<-[:RESPONSIBLE_FOR]-(old_collection)",
			"MATCH (old_collection)<-[old_connection:IN_COLLECTION]-(target:Contact)",
			"WHERE id(target) IN " + contact_list,
			"DELETE old_connection",
			"RETURN area, target"
		],
		{
			old_collection_id : this.collection_id
		},
		function (results) {
			return {
				area : results[0].area,
				targets : results.map(function (result) { return result.target; })
			};
		}.bind(this)
	).then(function (results) {
		var starts = [];
		var creates = [];
		var new_connections = results.targets.forEach(function (target) {
			var id = target.id;
			starts.push("t" + id + "=node(" + id + ")");
			creates.push("(new_collection)<-[:IN_COLLECTION]-(t" + id + ")");
		});
		return promise_query(this.directory.server,
			[
				"START area=node(" + results.area.id + "), " + starts.join(","),
				"CREATE (new_collection:Collection), (area)<-[:RESPONSIBLE_FOR]-(new_collection),",
				creates.join(","),
				"RETURN new_collection"
			],
			{},
			function (results) {
				return new Collection(this.directory, results[0].new_collection.id);
			}.bind(this)
		)
	}.bind(this));
}

// merges a collection into this one
Collection.prototype.merge = function (collection) {
	var collection_id = collection instanceof Object ? collection.collection_id : collection;
	return promise_query(this.directory.server,
		[
			"START old_collection=node({old_collection_id})",
			"MATCH (area:Area)<-[:RESPONSIBLE_FOR]-(old_collection)",
			"OPTIONAL MATCH (old_collection)<-[old_connection:IN_COLLECTION]-(target:Contact)",
			"DELETE old_connection, old_collection",
			"RETURN target"
		],
		{
			old_collection_id : collection_id
		},
		function (results) {
			return {
				targets : results.map(function (result) { return result.target; })
			};
		}.bind(this)
	).then(function (results) {
		if (results.targets.length) {
			var starts = [];
			var creates = [];
			var new_connections = results.targets.forEach(function (target) {
				var id = target.id;
				starts.push("t" + id + "=node(" + id + ")");
				creates.push("(new_collection)<-[:IN_COLLECTION]-(t" + id + ")");
			});
			return promise_query(this.directory.server,
				[
					"START new_collection=node(" + this.collection_id + "), " + starts.join(","),
					"CREATE " + creates.join(","),
					"RETURN new_collection"
				],
				{},
				function (results) {
					return this;
				}.bind(this)
			);
		} else return q(this);
	}.bind(this));
}

// make a collection as a successor to another
Collection.prototype.add_successor = function (collection) {

}

// joins a contact (existing/new) to a collection
// existing if ID provided, new if info provided
Collection.prototype.new_contact = function (contact_info) {

}

exports.Collection = Collection;

/**
 * Contact
 */

var Contact = function (directory, contact_id, contact_info, url) {

	this.directory = directory;
	this.contact_id = contact_id;
	this.contact_info = contact_info;
	if (url) this.url = url;
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

var intersect = function (a, b) {
	return a.filter(function (x) { return b.indexOf(x) > -1; });
}

var promise_query = function (server, query, params, process_results) {
	console.log(query);
	var query_str = query.join(" ");
	var deferred = q.defer();
	server.query(query_str, params, function (err, results) {
		if (err) {
			console.log(err);
			throw err;
			deferred.reject(err);
			return;
		}
		var processed_results = process_results(results);
		deferred.resolve(processed_results);
	});
	return deferred.promise;
}