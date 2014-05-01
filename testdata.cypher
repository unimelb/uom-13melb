// Generates test data in the 13MELB format, in Cypher for the Neo4j database.

CREATE 
	
	// Areas
	(area0:Area {
		name: 'BSB Student Services',
		address: 'Balwin Spencer Building',
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
		name: 'Financial Aid',
		phone: '13 MELB',
		email: 'finaid-info@unimelb.edu.au'
	}),
	(url0:Url {
		url: 'http://www.services.unimelb.edu.au/finaid/',
		description: 'Bookings and FAQ\'s are located here.'
	}),
	(area7:Area {
		name: 'Housing',
		phone: '13 MELB',
		email: 'housing-info@unimelb.edu.au'
	}),
	(url1:Url {
		url: 'www.services.unimelb.edu.au/housing/', 
		description: 'Bookings and FAQ\'s are located here.'
	}),

	// Collections
	(collection0:Collection),
	(collection1:Collection),
	(collection2:Collection),
	(collection3:Collection),
	(collection4:Collection),

	// People
	(person0:Person {
		first_name: 'Sally',
		last_name: 'Cullwick',
		position: 'Financial aid specialist',
		phone: '834 44156',
		email: 'cullwick@unimelb.edu.au'
	}),
	(person1:Person {
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
	(person2:Person {
		first_name: 'Peter',
		last_name: 'Anderson',
		position: 'Loan Repayments Officer',
		phone: '834 42945'
	}),
	(person3:Person {
		first_name:'Doug',
		last_name: 'Aplin',
		position: 'Assistant Manager, International Admissions',
		phone: '834 43761'
	}),
	(person4:Person {
		first_name: 'Roger',
		last_name: 'Deutscher',
		phone: '834 44150',
		email: 'barbp@unimelb.edu.au'
	}),
	(person5:Person {
		first_name: 'Michelle',
		last_name: 'Parsons',
		phone: '834 46901',
		email: 'mparsons@unimelb.edu.au'
	}),
	(person6:Person {
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

	// Person -> Collection (person in collection)
	(person5)-[:IN_COLLECTION]->(collection0),
	(person6)-[:IN_COLLECTION]->(collection0),
	(person0)-[:IN_COLLECTION]->(collection1),
	(person2)-[:IN_COLLECTION]->(collection1),
	(person1)-[:IN_COLLECTION]->(collection2),
	(person3)-[:IN_COLLECTION]->(collection3),
	(person4)-[:IN_COLLECTION]->(collection4),

	// Person -> Day (working hours)
	(person3)-[:ONLY_WORKS]->(friday),

	// Area -> URL
	(area6)-[:HAS_URL]->(url0),
	(area7)-[:HAS_URL]->(url1),

	// Person -> URL
	(person1)-[:HAS_URL]->(url2),
	(person2)-[:HAS_URL]->(url3),

	// Area -> Area (parent area)
	(area0)-[:PARENT_OF]->(area3),
	(area3)-[:PARENT_OF]->(area4),
	(area4)-[:PARENT_OF]->(area5),
	(area4)-[:PARENT_OF]->(area6),
	(area4)-[:PARENT_OF]->(area7),

	// Collection -> Area (collection manages area)
	(collection0)-[:RESPONSIBLE_FOR]->(area5),
	(collection1)-[:RESPONSIBLE_FOR]->(area6),
	(collection2)-[:RESPONSIBLE_FOR]->(area6),
	(collection3)-[:RESPONSIBLE_FOR]->(area6),
	(collection4)-[:RESPONSIBLE_FOR]->(area7)