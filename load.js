var fs = require("fs");
var util = require("util");
var q = require("q");

var incorporate = function (headers, data, validations) {
	var o = {};
	var bad = false;
	headers.forEach(function (header, i) {
		if (i < data.length && data[i] != "") {
			if (validations && validations[header] && !data[i].match(validations[header])) {
				console.log(data[i] + " does not conform to " + validations[header]);
				bad = true;
			}
			o[header] = data[i];
		}
	}.bind(this));
	if (bad) return false;
	else return o;
}

var datafile_generate_query = function (start_node, filename) {
	var deferred = q.defer();

	fs.readFile(filename, {encoding : "utf8"}, function (err, file_contents) {
		var id = 1;
		var base = { // already exists
			id : 0,
			base : true,
			children : []
		};
		var path = [base];

		var errors = [];
		file_contents.split("\n").forEach(function (line, lineno) {
			if (line.trim().length) {

				var indent = line.match(/^\t*/g)[0].length + 1;
				while (indent < path.length) path.pop();
				var area = path[path.length - 1];
				if (area === undefined || area.contacts === undefined) {
					errors.push("Indentation error on line " + lineno + ".");
					return;
				}

				line = line.trim();
				var type = line[0];
				var data = line.slice(1).match(/([^,\"]+|\"[^\"]+\"|)(,|$)/g);
				data = data.map(function (datum) {
					if (datum.slice(-1) == ",") datum = datum.slice(0,-1);
					return datum.replace(/([^\\]|^)\"/g, "$1").replace(/\\/g, "");
				});

				var phone_number_like = /^x?(\+?[0-9 ]+(\)[0-9 ]+)?)?$/;
				var name_like = /^[^0-9]+$/;
				validations = {
					first_name : name_like,
					last_name : name_like,
					phone : phone_number_like,
					fax : phone_number_like,
					email : /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))?$/,
				}
				
				// need this -> ' <- otherwise syntax highligter very confused

				switch (type) {
					case "$": // area
						var new_area = {
							id : id++,
							data : incorporate(["name", "note"], data),
							contacts : [],
							children : []
						};
						area.children.push(new_area);
						path.push(new_area);
						break;
					case "#": // contact
						var incorporated = incorporate(
							["first_name", "last_name", "position", "phone", "email", "address", "note", "url", "fax"],
						data, validations);
						if (!incorporated) {
							errors.push("Validation error with on line " + lineno + ": " + line);
						} else {
							var new_contact = {
								id : id++,
								data : incorporated
							};
							area.contacts.push(new_contact);
						}
						break;
					default:
						errors.push("Line " + lineno + " has no type marker.");
						break;
				}
			}
		});
		
		if (errors.length) {
			deferred.reject(errors);
			return;
		}

		var print_data = function (json) {
			var props = [];
			for (key in json) {
				props.push(util.format("%s: '%s'", key, json[key].replace(/'/g, "\\'")));
			}
			return util.format("{%s}", props.join(","));
		}
		var gen_node = function (id, type, data) {
			return {
				id : id,
				type : type,
				data : data || {}
			};
		};
		var print_node = function (node) {
			return util.format(
				"(n%d:%s %s)", node.id, node.type,
				print_data(node.data)
			);
		}

		var gen_rel = function (from_id, type, to_id, data) {
			return {
				from_id : from_id,
				to_id : to_id,
				type : type,
				data : data || {}
			};
		};
		var print_rel = function (rel) {
			return util.format(
				"(n%d)-[:%s %s]->(n%d)",
				rel.from_id, rel.type,
				print_data(rel.data),
				rel.to_id
			);
		}

		var gen_cypher = function (node_acc, rel_acc, area, parent) {
			if (!area.base) {
				node_acc.push(gen_node(area.id, "Area", area.data));
				rel_acc.push(gen_rel(parent, "PARENT_OF", area.id));
				if (area.contacts.length) {
					var collection_id = id++;
					node_acc.push(gen_node(collection_id, "Collection"));
					rel_acc.push(gen_rel(collection_id, "RESPONSIBLE_FOR", area.id));
					area.contacts.forEach(function (contact) {
						node_acc.push(gen_node(contact.id, "Contact", contact.data));
						rel_acc.push(gen_rel(contact.id, "IN_COLLECTION", collection_id));
					});
				}
			}
			area.children.forEach(function (child) {
				gen_cypher(node_acc, rel_acc, child, area.id);
			});
		}

		var nodes = [];
		var rels = [];
		gen_cypher(nodes, rels, base, null);

		var node_cypher = (
			util.format("START n0=node(%s) ", start_node) +
			"CREATE " + 
			//"(n0:Area { name: 'ROOT'}), " +
			nodes.map(print_node).concat(rels.map(print_rel)).join(",")
		);
		deferred.resolve(node_cypher);
		
	});
	return deferred.promise;
};

module.exports = datafile_generate_query;