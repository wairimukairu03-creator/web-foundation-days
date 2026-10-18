CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);


CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE enrollments (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);


INSERT INTO students (name, email) VALUES 
('Mwangi Kamau', 'mwangi.kamau@uonbi.ac.ke'),
('Amina Omondi', 'amina.omondi@ku.ac.ke'),
('Kipchoge Cheruiyot', 'kip.cheruiyot@jkuat.ac.ke'),
('Wanjiku Njoroge', 'wanjiku.njoroge@strathmore.edu');

INSERT INTO courses (name) VALUES 
('Introduction to Software Engineering'),
('Swahili Literature & Culture'),
('Data Science for Agriculture');

INSERT INTO enrollments (student_id, course_id, grade) VALUES 
(1, 1, 'A'), -- Mwangi enrolled in Software Engineering
(1, 3, 'B'), -- Mwangi enrolled in Data Science
(2, 1, 'A'), -- Amina enrolled in Software Engineering
(2, 2, 'A'), -- Amina enrolled in Swahili Literature
(3, 3, 'C'); -- Kipchoge enrolled in Data Science


SELECT c.name AS course_name 
FROM courses c
JOIN enrollments e ON c.id = e.course_id
JOIN students s ON s.id = e.student_id
WHERE s.name = 'Mwangi Kamau';

SELECT s.name AS student_name 
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE c.name = 'Introduction to Software Engineering';

SELECT c.name AS course_name, COUNT(e.student_id) AS total_students
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.name;

SELECT s.name AS student_name, s.email
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id
WHERE e.student_id IS NULL;

UPDATE enrollments 
SET grade = 'B'
WHERE student_id = 3 AND course_id = 3;
