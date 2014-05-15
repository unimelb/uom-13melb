var chai = require("chai")
	, chaiAsPromised = require("chai-as-promised")
	, uom_13melb = require("../api")
	, neo4j = require("neo4j")
	, q = require("q")
	, api = require("../api")
;

chai.use(chaiAsPromised);
var expect = chai.expect;

var server = new neo4j.GraphDatabase("http://localhost:7474");

// Encapsulates the entire directory system
describe("Directory", function () {

	// creates a new directory with the given Neo4J instance
	describe("Directory", function() {
		it("should be able to query the neo4j database", function (done) {
			var directory = new api.Directory(server);
			var query = "MATCH (x) RETURN x LIMIT 1";
			directory.server.query(query, {}, function (err, results) {
				expect(err).to.be.null;
				done();
			});
		});
	});

	// returns the root area for the directory (i.e., the one with no parents)
	describe("#root_area()", function () {
		it("should return the root area", function (done) {
			var directory = new api.Directory(server);
			expect(directory.root_area())
				.to.eventually.have.property("name", "13MELB").notify(done);
		});
	});

	// returns the area with given area ID
	describe("#area()", function () {
		it("should return the area with the ID", function (done) {
			var directory = new api.Directory(server);
			directory.root_area()
				.then(function (area) {
					return area.children();
				})
				.then(function (children) {
					return directory.area(children[0]);
				})
				.then(function (some_child) {
					var new_by_id = directory.area(some_child.area_id);
					expect(new_by_id.area_id).to.equal(some_child.area_id);
					done();
				})
			
		});

		it("should not return an area when given the ID of a non-area node");
	});


});

// produces information about areas within the directory
// including summaries of the amounts of children and collections within
// { area_id, name, notes, child_count, descendent_count, collection_count }
describe("Area", function () {

	// creates an area with the information
	describe("Area", function () {
		it("should create a new area with the given information");
	});

	// returns the area at the end of the path from the given area
	// probably only for internal use (i.e. when testing!)
	// -> Area
	describe("#descend_along_path()", function () {
		it("should return the area at the given path", function () {
			[
				{
					actual : [
						"BSB Student Support Services",
						"Student Support Contact List",
						"Student Support Services"
					],
					expected : [
						"BSB Student Support Services",
						"Student Support Contact List",
						"Student Support Services"
					]
				}
			].forEach(function (example) {
				var area = new Area();
				var actual = area.descend_along_path(example.expected);
				var expected = area;
				example.expected.every(function (desired_child) {
					var children = expected.children();
					var matched_child = children.some(function (child) {
						expected = child;
						return expected.name == desired_child.name;
					});
					return matched_child;
				});
				expect(actual.area_id).to.equal(expected.area_id);
			});
		});
	});

	// returns the children of the area
	// -> [Area]
	describe("#children()", function () {
		it("should return at least one actual child of the area", function() {
			[
				{
					path : [
						"BSB Student Support Services",
						"Student Support Contact List",
						"Student Support Services"
					],
					child : "Housing"
				}
			].forEach(function (example) {
				var area = new Area();
				var children = area.descend_along_path(example.path).children();
				expect(children)
			});
		});

		it("should return the same number of children as the area's child count");
		
	});

	// users often just want to see everything in a certain area
	// maybe even auto-expand based on descendent count?
	// -> {Area : {Area : ...}}
	describe("#descendents()", function () {
		it("should return at least one non-child descendent in the tree");
		it("should return descendents equalling the descendent count");
	});

	// returns the collections within the particular area node
	// -> [Collection]
	describe("#collections()", function() {
		it("should return at least one appropriate collection");
	});

	// returns the relevant trees underneath the Area
	// -> {Area : {Area : ...}}
	describe("#filter()", function () {
		it("should return at least one relevant result");
		it("should preserve the correct tree layout");
	})
});

// {contacts : [...], followed_by : [Collection]}
describe("Collection", function () {

});

describe("Contact", function () {

});