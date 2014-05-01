INSERT INTO contact (contact_id, phone, email, address, url, note)
VALUES
	(0, NULL, NULL, 'Balwin Spencer Building', NULL, NULL),
	(1, '834 46901', 'mparsons@unimelb.edu.au', NULL, NULL, NULL),
	(2, '834 46053', 'brownes@unimelb.edu.au', NULL, NULL, NULL),
	(3, '13 MELB', 'finaid-info@unimelb.edu.au', NULL, 'www.services.unimelb.edu.au/finaid/', 'Bookings and FAQ''s are located here.'),
	(4, '834 44156', 'cullwick@unimelb.edu.au', NULL, NULL, NULL),
	(5, '834 40350', 'international-finaid@unimelb.edu.au', NULL, 'http://go.unimelb.edu.au/d4an', 'US Financial Aid FAQs'),
	(6, '834 42945', NULL, NULL, 'http://go.unimelb.edu.au/54an', 'Canadian Financial Aid Info'),
	(7, '834 43761', NULL, NULL, NULL, NULL),
	(8, '13 MELB', NULL, 'housing-info@unimelb.edu.au', 'www.services.unimelb.edu.au/housing/', 'Bookings and FAQ''s are located here.'),
	(9, '834 44150', 'barbp@unimelb.edu.au', NULL, NULL, NULL),
	(10, '834 46901', 'mparsons@unimelb.edu.au', NULL, NULL, NULL),
	(11, '834 46053', 'brownes@unimelb.edu.au', NULL, NULL, NULL)
;

INSERT INTO area (area_id, name, note, contact_id)
VALUES
	(0, 'BSB Student Services', 'Please see below information for the list of services available to students. Standard protocols still in place. Do not call Front Counter: TLs only.', 0),
	(3, 'Student Support Contact List', 'Please refer students to the multi disciplinary team that provides assistance with any welfare concerns, financial aid – loans, bursaries and emergency financial support, student housing –online vacancies, emergency housing and specialised support for international students. ', NULL),
	(4, 'Student Support Services', '', NULL),
	(5, 'General enquiries', '', NULL),
	(6, 'Financial Aid', '', 3),
	(7, 'Housing', '', 8)
;

INSERT INTO area_parent (area_id, parent_id)
VALUES
	(3, 0),
	(4, 3), (5, 3), (6, 3), (7, 3), (8, 3)
;

INSERT INTO collection (collection_id, area_id)
VALUES
	(0, 5),
	(1, 6),
	(2, 6),
	(3, 6),
	(4, 7)
;

INSERT INTO collection_parent (collection_id, parent_id, note)
VALUES
	(3, 2, 'DO NOT CALL; unless for US/Canadian Financial Aid queries and only on Fridays, and only if Kelly Nicol is unavailable')
;

INSERT INTO person (person_id, first_name, last_name, title, note, contact_id)
VALUES
	(0, 'Sally', 'Cullwick', 'Financial aid specialist', '', 4),
	(1, 'Kelly', 'Nicol', 'Government Loans for US/Canadian Students Officer', '', 5),
	(2, 'Peter', 'Anderson', 'Loan Repayments Officer', '', 6),
	(3, 'Doug', 'Aplin', 'Assistant Manager, International Admissions', '', 7),
	(4, 'Roger', 'Deutscher', '', '', 9),
	(5, 'Michelle', 'Parsons', '', '', 10),
	(6, 'Sally', 'Browne', '', '', 11)
; 

INSERT INTO collection_person (collection_id, person_id)
VALUES
	(0, 5), (0, 6),
	(1, 0), (1, 2),
	(2, 1),
	(3, 3),
	(4, 4)
;

INSERT INTO person_day (person_id, day_id, start_time, end_time)
VALUES
	(3, 4, NULL, NULL)
;