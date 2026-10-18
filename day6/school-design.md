# School Database Design Explanation

## Table Breakdown

- **students**: Stores unique records of individuals attending the school. It includes an auto-incrementing ID, their name, and a unique email address constraint.
- **courses**: Holds the names of available subjects offered in the curriculum, identified by a distinct course ID.
- **enrollments**: A bridge/join table that maps students to their respective courses. It includes the `grade` earned by the student in that specific course.

## Relationships & The Bridge Table

- **Students to Enrollments**: One-to-Many (\(1:N\)). One student can have multiple enrollment entries.
- **Courses to Enrollments**: One-to-Many (\(1:N\)). One course can be tied to multiple student enrollments.
- **Students to Courses**: Many-to-Many (\(M:N\)). A student can take many courses, and a course can be taken by many students.
- **Why a join table is needed**: Relational databases cannot directly map a Many-to-Many relationship between two distinct tables without causing data redundancy and structural anomalies. The `enrollments` table breaks down this complex relationship into two clean One-to-Many links and directly acts as a container for attributes that belong strictly to the interaction between a specific student and course (such as the `grade`).

## Database Optimization (Index)

- **Index Recommendation**: Create an index on `students(name)`.
- **Reason**: Our business logic regularly looks up records filtering by a student's full name (such as in Query 1). Indexing this field changes lookup performance from an \(O(N)\) full-table scan to an \(O(\log N)\) fast lookup, accelerating queries significantly as enrollment grows across campuses.
