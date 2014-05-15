/*
Generates the relations for the 13MELB database.
Author: Martin Kwok
*/

/*
Represents an `area': a responsibility for a collection.
*/
CREATE TABLE area (
	area_id INT NOT NULL,

	name VARCHAR(256) NOT NULL,
	note TEXT,

	contact_id INT,

	PRIMARY KEY (area_id),

	FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
		ON UPDATE SET NULL ON DELETE SET NULL
);

/*
Represents the hierarchy of areas, e.g. Student Centre -> Science Student 
Centre. There is potential for multiple parents in the case of `See other' 
relations.
*/
CREATE TABLE area_parent (
	area_id INT NOT NULL,
	parent_id INT NOT NULL,

	PRIMARY KEY (area_id, parent_id),

	FOREIGN KEY (area_id) REFERENCES area (area_id)
		ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (parent_id) REFERENCES area (area_id)
		ON UPDATE CASCADE ON DELETE CASCADE
);

/*
Represents a collection [of people] in the system, responsible for an area 
(the `leaf' areas). Collections are purely for semantic purposes: they
represent the logical groups of people who are followed by / following some
other group of people.
*/
CREATE TABLE collection (
	collection_id INT NOT NULL,

	area_id INT NOT NULL,

	PRIMARY KEY (collection_id),

	FOREIGN KEY (area_id) REFERENCES area (area_id)
		ON UPDATE CASCADE ON DELETE CASCADE
);

/*
collections also have a hierarchy, but in this case it represents the 
`sequence' in which collections are to be contacted, with the parent being 
before the child.
*/
CREATE TABLE collection_parent (
	collection_id INT NOT NULL,
	parent_id INT NOT NULL,

	note TEXT NOT NULL,
	
	PRIMARY KEY (collection_id, parent_id),

	FOREIGN KEY (collection_id) REFERENCES collection (collection_id)
		ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (parent_id) REFERENCES collection (collection_id)
		ON UPDATE CASCADE ON DELETE CASCADE
);

/*
A contact is a set of contact details for an entity (either an area or a 
person).
*/
CREATE TABLE contact (
	contact_id INT NOT NULL,

	phone VARCHAR(128),
	email VARCHAR(256),
	address VARCHAR(256),
	url TEXT,
	note TEXT,

	PRIMARY KEY (contact_id)
);

/*
Represents a single person within the system. Contact details are stored in the
related contact entity.
*/
CREATE TABLE person (
	person_id INT NOT NULL,

	first_name VARCHAR(256) NOT NULL,
	last_name VARCHAR(256) NOT NULL,
	title VARCHAR(256) NOT NULL,
	note TEXT,

	contact_id INT NOT NULL,

	PRIMARY KEY (person_id),

	FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
		ON UPDATE CASCADE ON DELETE RESTRICT
);

/*
Just stores the days of the week. In some shift systems this may be different.
*/
CREATE TABLE day (
	day_id INT NOT NULL,
	
	name VARCHAR(9) NOT NULL,

	PRIMARY KEY (day_id)
);
INSERT INTO day (day_id, name)
VALUES 
	(0, 'Monday'),
	(1, 'Tuesday'),
	(2, 'Wednesday'),
	(3, 'Thursday'),
	(4, 'Friday'),
	(5, 'Saturday'),
	(6, 'Sunday')
;

/*
Some people work part-time: if so, this stores their availabilities. If there 
are no entries for them they work full-time. NOT IDEAL, will do for now.
*/
CREATE TABLE person_day (
	person_id INT NOT NULL,
	day_id INT NOT NULL,

	start_time INT,
	end_time INT,

	PRIMARY KEY (person_id, day_id)
);

/*
As mentioned, all collections contain people. A person may belong to multiple 
collections as well.
*/
CREATE TABLE collection_person (
	collection_id INT NOT NULL,
	person_id INT NOT NULL,

	PRIMARY KEY (collection_id, person_id),

	FOREIGN KEY (collection_id) REFERENCES collection (collection_id)
		ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (person_id) REFERENCES person (person_id)
		ON UPDATE CASCADE ON DELETE CASCADE
);