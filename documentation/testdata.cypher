// Generates test data in the 13MELB format, in Cypher for the Neo4j database.
CREATE 
	
	// Areas
	(root:Area {
		name: '13MELB'
	}),
	(area0:Area {
		name: 'BSB Student Services',
		note: 'Please see below information for the list of services available to students. Standard protocols still in place. Do not call Front Counter: TLs only.'
	}),
	(area3:Area {
		name: 'Student Support Contact List',
		note: 'Please refer students to the multi disciplinary team that provides assistance with any welfare concerns, financial aid – loans, bursaries and emergency financial support, student housing –online vacancies, emergency housing and specialised support for international students.'
	}),
	(area4:Area {
		name: 'Student Support Services'
	}),
	(area5:Area {
		name: 'General enquries'
	}),
	(area6:Area {
		name: 'Financial Aid'
	}),
	(url0:Url {
		url: 'http://www.services.unimelb.edu.au/finaid/',
		description: 'Bookings and FAQ\'s are located here.'
	}),
	(area7:Area {
		name: 'Housing'
	}),
	(url1:Url {
		url: 'www.services.unimelb.edu.au/housing/', 
		description: 'Bookings and FAQ\'s are located here.'
	}),

	// Collections
	(collection_0:Collection),
	(collection_1:Collection),
	(collection_2:Collection),
	(collection0:Collection),
	(collection1:Collection),
	(collection2:Collection),
	(collection3:Collection),
	(collection4:Collection),

	// Contacts
	(contact0:Contact {
		address: 'Balwin Spencer Building'
	}),
	(contact1:Contact {
		phone: '13 MELB',
		email: 'finaid-info@unimelb.edu.au'
	}),
	(contact2:Contact {
		phone: '13 MELB',
		email: 'housing-info@unimelb.edu.au'
	}),
	(person0:Contact:Person {
		first_name: 'Sally',
		last_name: 'Cullwick',
		position: 'Financial aid specialist',
		phone: '834 44156',
		email: 'cullwick@unimelb.edu.au'
	}),
	(person1:Contact {
		first_name: 'Kelly',
		last_name: 'Nicol',
		position: 'Government Loans for US/Canadian Students Officer',
		phone: '834 40350',
		email: 'international-finaid@unimelb.edu.au'
	}),
	(url2:Url {
		url: 'http://go.unimelb.edu.au/d4an',
		description: 'US Financial Aid FAQs'
	}),
	(url3:Url {
		url: 'http://go.unimelb.edu.au/54an',
		description: 'Canadian Financial Aid Info'
	}),
	(person2:Contact {
		first_name: 'Peter',
		last_name: 'Anderson',
		position: 'Loan Repayments Officer',
		phone: '834 42945'
	}),
	(person3:Contact {
		first_name:'Doug',
		last_name: 'Aplin',
		position: 'Assistant Manager, International Admissions',
		phone: '834 43761'
	}),
	(person4:Contact {
		first_name: 'Roger',
		last_name: 'Deutscher',
		phone: '834 44150',
		email: 'barbp@unimelb.edu.au'
	}),
	(person5:Contact {
		first_name: 'Michelle',
		last_name: 'Parsons',
		phone: '834 46901',
		email: 'mparsons@unimelb.edu.au'
	}),
	(person6:Contact {
		first_name: 'Sally',
		last_name: 'Browne',
		phone: '834 46053',
		email: 'brownes@unimelb.edu.au'
	}),

	// Days
	(monday:Day { name: 'Monday'}),
	(tuesday:Day { name: 'Tuesday'}),
	(wednesday:Day { name: 'Wednesday'}),
	(thursday:Day { name: 'Thursday'}),
	(friday:Day { name: 'Friday'}),

	// Collection -> Collection (sequences)
	(collection2)-[:COMES_BEFORE {
		note: 'DO NOT CALL; unless for US/Canadian Financial Aid queries and only on Fridays, and only if Kelly Nicol is unavailable'
	}]->(collection3),

	// Contact -> Collection (person in collection)
	(contact0)-[:IN_COLLECTION]->(collection_0),
	(contact1)-[:IN_COLLECTION]->(collection_1),
	(contact2)-[:IN_COLLECTION]->(collection_2),
	(person5)-[:IN_COLLECTION]->(collection0),
	(person6)-[:IN_COLLECTION]->(collection0),
	(person0)-[:IN_COLLECTION]->(collection1),
	(person2)-[:IN_COLLECTION]->(collection1),
	(person1)-[:IN_COLLECTION]->(collection2),
	(person3)-[:IN_COLLECTION]->(collection3),
	(person4)-[:IN_COLLECTION]->(collection4),

	// Contact -> Day (working hours)
	// e.g. [:ONLY_WORKS { from: '0900', to: '1600'}]
	(person3)-[:ONLY_WORKS]->(friday),

	// Area -> URL
	(contact1)-[:HAS_URL]->(url0),
	(contact2)-[:HAS_URL]->(url1),

	// Contact -> URL
	(person1)-[:HAS_URL]->(url2),
	(person2)-[:HAS_URL]->(url3),

	// Area -> Area (parent area)
	(root)-[:PARENT_OF]->(area0),
	(area0)-[:PARENT_OF]->(area3),
	(area3)-[:PARENT_OF]->(area4),
	(area4)-[:PARENT_OF]->(area5),
	(area4)-[:PARENT_OF]->(area6),
	(area4)-[:PARENT_OF]->(area7),

	// Collection -> Area (collection manages area)
	(collection_0)-[:RESPONSIBLE_FOR]->(area0),
	(collection_1)-[:RESPONSIBLE_FOR]->(area6),
	(collection_2)-[:RESPONSIBLE_FOR]->(area7),
	(collection0)-[:RESPONSIBLE_FOR]->(area5),
	(collection1)-[:RESPONSIBLE_FOR]->(area6),
	(collection2)-[:RESPONSIBLE_FOR]->(area6),
	(collection3)-[:RESPONSIBLE_FOR]->(area6),
	(collection4)-[:RESPONSIBLE_FOR]->(area7)
