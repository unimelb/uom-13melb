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

		// USEFULNESS QUESTIONABLE - overengineering?
		// can just use children() repeatedly, at least for the moment

		// users often just want to see everything in a certain area
		// maybe even auto-expand based on descendent count?
		// -> [{Area : [{Area : ...}]}]
		/*describe("#descendents()", function () {
			it("should return at least one path down the tree", function (done) {

				var path = [
					"BSB Student Services",
					"Student Support Contact List",
					"Student Support Services"
				];

				directory.root_area().then(function (area) {
					area.descendents()
				}).then(function (descendents) {
					path.every(function (area_name) {
						Object.keys(descendents).some(function (child)) {
							if (child.area_name == area_name) {
								descendents = 
								return 
							} else return false;
						}
					});
				});
			});
		});*/

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
							return result.get_name()
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
			})
		})
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
	});

	describe("Contact", function () {
		it("should contain the correct information for a contact");
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
						contact
						== target_contact
					);
				}
			)
		})
	);
 }