# Library Books API Design

## Endpoints

### 1. List All Books

- **Method:** GET
- **Path:** `/books`
- **Description:** Retrieves a complete list of all books available in the library database.
- **Success Status Code:** 200 OK

### 2. Get a Specific Book

- **Method:** GET
- **Path:** `/books/:id`
- **Description:** Retrieves the detailed information of a single book matching the unique ID parameter.
- **Success Status Code:** 200 OK

### 3. Create a New Book

- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a brand new book resource to the library catalog.
- **Request Body Example:**
  ```json
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "9780743273565",
    "publishedYear": 1925
  }
  ```
- **Success Status Code:** 201 Created

### 4. Update an Existing Book

- **Method:** PUT
- **Path:** `/books/:id`
- **Description:** Replaces or updates the complete profile data of an existing book using its unique ID.
- **Request Body Example:**
  ```json
  {
    "title": "The Great Gatsby (Revised)",
    "author": "F. Scott Fitzgerald",
    "isbn": "9780743273565",
    "publishedYear": 1926
  }
  ```
- **Success Status Code:** 200 OK

### 5. Delete a Book

- **Method:** DELETE
- **Path:** `/books/:id`
- **Description:** Permanently removes a specified book record from the system database.
- **Success Status Code:** 204 No Content

### 6. List Books by Author

- **Method:** GET
- **Path:** `/books?author=:authorName`
- **Description:** Filters and returns a refined list of book objects belonging to a specific author string.
- **Success Status Code:** 200 OK

## Error Codes and Examples

### 400 Bad Request

- **Example Case:** Sent back if a client attempts a `POST /books` request with a missing required parameter, such as leaving out the `"title"` or sending text data inside the numeric `"publishedYear"` field.

### 404 Not Found

- **Example Case:** Sent back if a client queries a non-existent database route or resource identifier, such as submitting a request to `GET /books/99999` when that index location does not exist.
