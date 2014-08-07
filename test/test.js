"use strict";

var chai = require("chai")
	, chaiAsPromised = require("chai-as-promised")
	, neo4j = require("neo4j")
	, q = require("q")
	, dir = require("../directory")
;

chai.use(chaiAsPromised);
var expect = chai.expect;

var server = new neo4j.GraphDatabase(process.env.GRAPHENEDB_URL);

var directory;

beforeEach(function () {
	directory = new dir.Directory(server);
});

// Encapsulates the entire directory system
describe("Directory System", function () {
	this.timeout(0);
	describe("Directory", function () {

		// creates a new directory with the given Neo4J instance
		it("should be able to query the neo4j database", function (done) {
			var query = "MATCH (x) RETURN x LIMIT 1";
			directory.server.query(query, {}, function (err, results) {
				expect(err).to.be.null;
				done();
			});
		});

		// returns the root area for the directory (i.e., the one with no parents)
		describe("#root_area()", function () {
			it("should return the root area", function (done) {
				expect(directory.root_area())
					.to.eventually.have.property("name", "13MELB").notify(done);
			});
		});

		// returns the area with given area ID
		describe("#area()", function () {
			it("should return the area with the ID", function (done) {
				var some_child;
				directory.root_area()
					.then(function (area) {
						return area.children();
					})
					.then(function (children) {
						some_child = children[0];
						return directory.area(some_child.get_area_id());
					})
					.then(function (new_by_id) {
						expect(new_by_id.get_area_id()).to.equal(
							some_child.get_area_id()
						);
						done();
					})
				;
				
			});

			it("should not return an area when given the ID of a non-area node");
		});


	});

	// produces information about areas within the directory
	// including summaries of the amounts of children and collections within
	// { area_id, name, notes, child_count, descendent_count, collection_count }
	describe("Area", function () {

		// creates an area with the information
		it("should contain the correct area information", function () {

			var path = [
				"BSB Student Services",
				"Student Support Contact List",
				"Student Support Services",
				"General enquiries"
			];

			directory.root_area(function (area) {
				return area.descend_along_path(path);
			}).then(function (area) {
				expect(area.get_name()).to.equal("General enqiries");
				expect(area.get_notes()).to.equal("");
				done();
			});
		});

		// returns the area at the end of the path from the given area
		// probably only for internal use (i.e. when testing!)
		// -> Area
		describe("#descend_along_path()", function () {
			it("should return the area at the given path", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services"
				];

				directory.root_area()
					.then(function (area) {
						return area.descend_along_path(path);
					})
					.then(function (area) {
						expect(area.get_name()).to.equal(path[path.length - 1]);
						done();
					})
				;
			});
		});

		describe("#parent()", function () {
			it("should return the parent of the area", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services"
				];

				directory.root_area()
					.then(function (area) {
						return area.descend_along_path(path);
					})
					.then(function (area) {
						return area.parent();
					})
					.then(function (parent) {
						expect(parent.get_name()).to.equal(path[path.length - 2]);
						done();
					}, function (err) { console.log(err); })
				;
			});
		});

		// returns the children of the area
		// -> [Area]
		describe("#children()", function () {
			it("should return at least one actual child of the area",
				function(done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services"
					];

					directory.root_area()
						.then(function (area) {
							return area.descend_along_path(path);
						})
						.then(function (area) {
							return area.children();
						})
						.then(function (children) {
							expect(children.map(function (child) {
								return child.get_name();
							})).to.include("Housing");
							done();
						})
					;
				}
			);
		});

		describe("#descendents()", function () {
			it("should return a descendent of the area",
				function (done) {
					var name = "Financial Aid";
					directory.root_area().then(function (area) {
						return area.descendents();
					}).then(function (desc) {
						var contains = function (area, n) {
							return (
								area.area.name == n ||
								area.children.some(function (child) {
									return contains(child, n);
								})
							);
						}
						expect(contains(desc, name)).to.be.true;
						done();
					});
				}
			);
		})

		describe("#path()", function () {
			it("should return the path to the area",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services"
					];

					directory.root_area()
						.then(function (area) {
							return area.descend_along_path(path);
						})
						.then(function (area) {
							return area.path();
						}).then(function (path_to_area) {
							expect(path_to_area.slice(1).every(
								function (node, index) {
									return (
										node.name == path[index] ||
										index >= path.length
									);
								}
							)).to.be.true;
							done();
						})
				}
			);
		});

		// returns the relevant nodes from underneath the Area
		// can use parent() to traverse back up to discover path
		// -> [Area]
		describe("#search()", function () {

			it("should return at least one relevant result", function (done) {
				directory.root_area()
					.then(function (area) {
						return area.search("financial ai");
					})
					.then(function (results) {
						expect(results.map(function (result) {
							return result[result.length-1].get_name()
						})).to.contain("Financial Aid");
						done();
					})
				;
			});
		})

		// returns the INITIAL collections within the particular area node
		// -> [Collection]
		describe("#collections()", function () {
			it("should return the right amount of collections",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Financial Aid"
					];

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						expect(collections).to.have.length(3);
						done();
					});
				}
			);
		});

		describe("#all_contacts()", function () {
			it("should return all contacts in the area", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services",
					"Financial Aid"
				];

				var name = "Kelly";

				directory.root_area().then(function (area) {
					return area.descend_along_path(path);
				}).then(function (area) {
					return area.all_contacts();
				}).then(function (all_contacts) {
					expect(all_contacts.some(function (collection) {
						return collection.contacts.some(function (contact) {
							return contact.contact_info.first_name == name;
						});
					})).to.be.true;
					done();
				});
			});
		});

		describe("#descendent_contact_count()", function () {
			it(
				"should return the count of all contacts " +
				"at or beneath the area",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services"
					];

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.descendent_contact_count();
					}).then(function (count) {
						expect(count["contacts"]).to.equal(13);
						done();
					})
				}
			);
		});

		describe("#new_child()", function () {
			it("should create a child in the right place", function (done) {
				directory.root_area().then(function (root) {
					return root.new_child("TEST AREA");
				}).then(function (area) {
					expect(area.name).to.equal("TEST AREA");
					return area.remove();
				}).then(function (parent) {
					done();
				});
			});
		});

		describe("#update()", function () {
			it("should update the area with the correct information",
				function (done) {
					var name = "BLAH BLAH";
					var note = "THIS IS A NOTE";
					var area_id;
					directory.root_area().then(function (root) {
						return root.new_child("TEST AREA");
					}).then(function (area) {
						area_id = area.area_id;
						return area.update({name: name, note: note});
					}).then(function (area) {
						//console.log(area_id);
						return directory.area(area_id);
					}).then(function (area) {
						//console.log([area.name, area.note]);
						expect(area.name).to.equal(name);
						expect(area.note).to.equal(note);
						return area.remove();
					}).then(function () {
						done();
					});
				}
			);
		});

		describe("#change_parent()", function () {
			it("should change to the supplied parent", function (done) {
				var root, moved_area, new_parent;
				directory.root_area().then(function (root_area) {
					root = root_area;
					return root.children();
				}).then(function (children) {
					new_parent = children[0];
					return children[1].change_parent(new_parent);
				}).then(function (area) {
					moved_area = area;
					return area.parent();
				}).then(function (parent) {
					expect(parent.area_id).to.equal(new_parent.area_id);
					return moved_area.change_parent(root);
				}).then(function (parent) {
					done();
				});
			});
		});

		describe("#detach()", function () {
			it("should seperate the area from its parent", function (done) {
				var root, child;
				directory.root_area().then(function (root_area) {
					root = root_area;
					return root.children();
				}).then(function (children) {
					child = children.pop();
					return child.detach();
				}).then(function (former_parent) {
					expect(former_parent.area_id).to.equal(root.area_id);
					return child.parent();
				}).then(function (parent) {
					expect(parent).to.be.null;
					return child.change_parent(root);
				}).then(function (parent) {
					done();
				});
			});
		});

		describe("#remove()", function () {
			it("should delete the area and all children", function (done) {
				var name = "T" + Math.random();
				var root;
				directory.root_area().then(function (root_area) {
					root = root_area;
					return root.new_child(name);
				}).then(function (area) {
					return area.remove();
				}).then(function (parent) {
					return root.children();
				}).then(function (children) {
					expect(
						children.map(function (child) { return child.name; })
					).to.not.contain(name);
					done();
				});
			});
		});

		describe("#new_collection()", function () {
			it("should create a new collection", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services",
					"General enquiries"
				];

				var new_collection;
				var to_merge;
				var target_area;
				directory.root_area().then(function (area) {
					return area.descend_along_path(path);
				}).then(function (area) {
					target_area = area;
					return area.new_collection();
				}).then(function (collection) {
					new_collection = collection;
					return target_area.collections();
				}).then(function (collections) {
					to_merge = collections[0].collection_id == new_collection.collection_id
						? collections[1]
						: collections[0]
					;
					expect(collections.map(function (collection) {
						return collection.collection_id;
					})).to.contain(new_collection.collection_id);
					return to_merge.merge(new_collection);
				}).then(function () {
					done();
				});
			});
		});
	});

	describe("Collection", function () {

		// The contacts in the collection
		// -> [Contacts]
		describe("#contacts()", function () {
			it("should return the people in the collection", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services",
					"Financial Aid"
				];
				var target_contacts = ["Cullwick", "Anderson"];

				directory.root_area()
					.then(function (area) {
						return area.descend_along_path(path);
					})
					.then(function (area) {
						return area.collections();
					})
					.then(function (collections) {
						return q.all(collections.map(function (collection) {
							return collection.contacts();
						}));
					})
					.then(function (contactss) {
						expect(contactss.some(function (contacts) {
							return array_equiv(
								contacts.map(function (contact) {
									return contact.get_info().last_name
								}), target_contacts
							);
						})).to.be.true;
						done();
					});
				;
			});
		});

		// returns the successor collections (for when this collection is 
		// unreachable).
		// -> [Collection]
		describe("#successors()", function () {
			it.skip("should return the successor collections", function (done) {
				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services",
					"Financial Aid"
				];
				var target_start = ["Nicol"];
				var target_end = ["Alpin"];

				var returned_colls;

				directory.root_area()
					.then(function (area) {
						return area.descend_along_path(path);
					})
					.then(function (area) {
						return area.collections();
					})
					.then(function (collections) {
						returned_colls = collections;
						return q.all(collections.map(function (collection) {
							return collection.contacts();
						}));
					})
					.then(function (contactss) {
						var first_coll;
						contactss.some(function (contacts, index) {
							if (array_equiv(
								contacts.map(function (contact) {
									return contact.get_info().last_name
								}), target_contacts
							)) {
								first_coll = returned_colls[index];
								return true;
							} else return false;
						});
						return first_coll.successors();
					}).then(function (collections) {
						returned_colls = collections;
						return q.all(collections.map(function (collection) {
							return collection.contacts();
						}));
					}).then(function (contactss) {
						// check for good group of contacts
						done();
					});
			});
		});
		describe("#split()", function () {
			it("should move the target contacts to a new collection",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"General enquiries"
					];

					var collection;
					var new_collection;
					var contact;
					var remainder;

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						collection = collections[0];
						return collection.contacts();
					}).then(function (contacts) {
						contact = contacts[0];
						remainder = contacts.slice(1);
						return collection.split([contact]);
					}).then(function (new_coll) {
						new_collection = new_coll;
						return new_collection.contacts();
					}).then(function (new_contacts) {
						expect(new_contacts[0].contact_id)
							.to.equal(contact.contact_id);
						return collection.merge(new_collection);
					}).then(function () {
						done();
					})
				}
			)
		});

		describe("#merge()", function () {
			it("should move the contacts back to the collection",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"General enquiries"
					];

					var collection;
					var old_contacts;

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						collection = collections[0];
						return collection.contacts();
					}).then(function (contacts) {
						old_contacts = contacts.map(function (contact) {
							return contact.contact_id;
						});
						return collection.split([contacts[0]]);
					}).then(function (new_coll) {
						return collection.merge(new_coll);
					}).then(function (old_collection) {
						return old_collection.contacts();
					}).then(function (contacts) {
						expect(contacts.every(function (contact) {
							return (
								old_contacts.indexOf(contact.contact_id) > -1
							);
						})).to.be.true;
						done();
					})
				}
			)
		});

		describe("#add_successor()", function () {
			it("should add the given collection as a successor",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Housing"
					];

					var pred, succ;

					directory.root_area().then(function (area) {
						return area.descend_along_path(path)
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						pred = collections[0];
						succ = collections[1];
						return pred.add_successor(succ);
					}).then(function (collection) {
						return pred.successors();
					}).then(function (successors) {
						expect(successors.map(function (successor) {
							return successor.collection_id;
						})).to.contain(succ.collection_id);
						return pred.remove_successor(succ);
					}).then(function () {
						done();
					});
				}
			);
		});

		describe("#remove_successor()", function () {
			it("should add the given collection as a successor",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Housing"
					];

					var pred, succ;

					directory.root_area().then(function (area) {
						return area.descend_along_path(path)
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						pred = collections[0];
						succ = collections[1];
						return pred.add_successor(succ);
					}).then(function (successors) {
						return pred.remove_successor(succ);
					}).then(function () {
						return pred.successors();
					}).then(function (successors) {
						expect(successors.map(function (successor) {
							return successor.collection_id;
						})).to.not.contain(succ.collection_id);
						done();
					});
				}
			);
		});

		describe("#new_contact()", function () {
			it("should add a new contact if contact info is given",
				function (done) {
					var name = Math.random().toString();
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Housing"
					];

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						var collection = collections[0];
						collection.new_contact({
							"first_name" : name
						}).then(function (contact) {
							return directory.contact(
								contact.contact_id
							);
						}).then(function (contact) {
							expect(contact.contact_info.first_name)
								.to.equal(name);
							return contact.remove();
						}).then(function () {
							done();
						})
					});
				}
			);

			it("should join an existing contact if contact_id is given",
				function (done) {
					var name = Math.random().toString();
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Housing"
					];

					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.collections();
					}).then(function (collections) {
						var collection = collections[0];
						var alternative = collections[1];
						var chosen_contact;
						collection.contacts().then(function (contacts) {
							chosen_contact = contacts[0];
							return alternative.new_contact(chosen_contact);
						}).then(function (collection) {
							return alternative.contacts();
						}).then(function (contacts) {
							expect(contacts.some(function (contact) {
								return contact.contact_id
									== chosen_contact.contact_id
								;
							})).to.be.true;
							return chosen_contact.detach(alternative);
						}).then(function () {
							done();
						});
					});
				}
			);
		});
	});

	describe("Contact", function () {
		it("should contain the correct information for a contact");
		describe("#update", function () {
			it("should update the named fields with the given values",
				function (done) {
					var path = [
						"BSB Student Services",
						"Student Support Contact List",
						"Student Support Services",
						"Housing"
					];
					var new_name = (Math.random()).toString();
					var old_name;
					var edited_contact;
					directory.root_area().then(function (area) {
						return area.descend_along_path(path);
					}).then(function (area) {
						return area.all_contacts();
					}).then(function (all_contacts) {
						edited_contact = all_contacts[1].contacts[0];
						old_name = edited_contact.contact_info.first_name;
						return edited_contact.update({
							first_name : new_name
						});
					}).then(function () {
						return directory.contact(edited_contact.contact_id);
					}).then(function (contact) {
						expect(
							contact.contact_info.first_name
						).to.equal(new_name);
						return edited_contact.update({
							first_name : old_name
						});
					}).then(function () {
						done();
					});
				}
			);
		})
	});
});

/**
 * Patterns
 */

// Arrays contain the same elements (in any order)
// could replace with sort then zip
 var array_equiv = function(contacts, target_contacts) {
 	return (
		contacts.length == target_contacts.length
		&& contacts.every(function (contact) {
			return target_contacts.some(
				function (target_contact) {
					return (
						contact == target_contact
					);
				}
			)
		})
	);
 }