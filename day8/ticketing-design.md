# TicketHub: System Design Document

## 1. System Requirements

### Functional Requirements

- **Browse Events:** Users can search and view available concerts, artists, venues, and dates.
- **View Seats:** Users can view a real-time layout of available and occupied seats for a specific event.
- **Hold Seats:** Users can temporarily lock specific seats for 5–10 minutes while completing checkout.
- **Process Payments:** Users can securely pay for held seats via integrated payment gateways (e.g., M-Pesa).
- **View Tickets:** Users can view their purchased tickets, booking history, and unique digital ticket vouchers (QR codes).

### Non-Functional Requirements

- **Speed (Low Latency):** Page loads and seat selections must take under 200ms, even during sudden traffic spikes, to prevent user frustration.
- **Correctness (Consistency):** Strict data consistency is required. A seat must never be double-booked or sold to more than one user.
- **Fairness (Concurrency Control):** First-come, first-served access during flash sales. No user should be bypassed due to race conditions or system favoritism.
- **High Availability:** The system must maintain 99.99% uptime, especially the browsing and ticket retrieval paths, during high-demand sales events.

---

## 2. Traffic & Load Estimates

### Normal Traffic

- **Daily Visitors:** 50,000 unique users.
- **Total Page Views:** 50,000 users × 10 pages/user = 500,000 page views per day.
- **Average Requests Per Second (RPS):** 500,000 requests / 86,400 seconds ≈ **5.8 RPS**.
- **Daily Sales Volume:** 5,000 tickets sold per day.

### "Big Sale" Peak Traffic

- **Target Audience:** 200,000 concurrent users competing for 20,000 seats.
- **Time Window:** 10 minutes (600 seconds).
- **Estimated Interaction Rate:** Assuming each user performs approximately 10 actions (refreshing, selecting seats, clicking buy) during this high-anxiety window:
  - Total Requests = 200,000 users × 10 requests = 2,000,000 requests.
- **Peak Requests Per Second (RPS):** 2,000,000 requests / 600 seconds ≈ **3,333 RPS**.

### Traffic Comparison

- **The Scale Jump:** Traffic surges from a baseline of ~6 RPS to a massive **3,333 RPS** during a popular concert release.
- **The Challenge:** This represents a **~550x increase** in sudden load. Standard relational database writes will bottleneck immediately under this pressure without caching and queue architectures.

---

## 3. API Design

### 1. Browse Events

- **Endpoint:** `GET /api/v1/events`
- **Query Params:** `page=1&limit=20&search=Sauti+Sol`
- **Response (200 OK):**

```json
{
  "events": [
    {
      "id": "evt_9982",
      "title": "De Matthew Live in Nairobi",
      "venue": "KICC",
      "date": "2026-12-12T18:00:00Z",
      "status": "AVAILABLE"
    }
  ]
}
```

### 2. View Seats

- **Endpoint:** `GET /api/v1/events/{event_id}/seats`
- **Response (200 OK):**

```json
{
  "event_id": "evt_9982",
  "total_seats": 20000,
  "seats": [
    { "seat_id": "ST-A1", "row": "A", "number": 1, "status": "AVAILABLE" },
    { "seat_id": "ST-A2", "row": "A", "number": 2, "status": "HELD" }
  ]
}
```

### 3. Hold Seats

- **Endpoint:** `POST /api/v1/bookings/hold`
- **Request Body:**

```json
{
  "event_id": "evt_9982",
  "seat_ids": ["ST-A1"]
}
```

- **Response (201 Created):**

```json
{
  "booking_id": "bk_5541",
  "expires_at": "2026-10-25T20:50:00Z",
  "status": "HELD"
}
```

### 4. Process Payment

- **Endpoint:** `POST /api/v1/bookings/{booking_id}/pay`
- **Request Body:**

```json
{
  "payment_method": "MPESA",
  "phone_number": "254712345678"
}
```

- **Response (200 OK):**

```json
{
  "payment_status": "PENDING_STK_PUSH",
  "message": "Please enter your PIN on your handset."
}
```

### 5. View Tickets

- **Endpoint:** `GET /api/v1/tickets/{ticket_id}`
- **Response (200 OK):**

```json
{
  "ticket_id": "tkt_1102",
  "booking_id": "bk_5541",
  "event_title": "De Matthew Live in Nairobi",
  "seat": "Row A, Seat 1",
  "qr_code_url": "https://ticketinghub.com"
}
```

---

## 4. Database Schema

We use a Relational Database (like PostgreSQL) to handle strict transactions for payments and orders, coupled with a fast caching layer (Redis) for real-time seat locks.

### `users` Table

| Column Name | Data Type    | Constraints        |
| :---------- | :----------- | :----------------- |
| `id`        | VARCHAR(36)  | PRIMARY KEY (UUID) |
| `name`      | VARCHAR(100) | NOT NULL           |
| `email`     | VARCHAR(100) | UNIQUE, NOT NULL   |
| `phone`     | VARCHAR(15)  | NOT NULL           |

### `events` Table

| Column Name  | Data Type    | Constraints |
| :----------- | :----------- | :---------- |
| `id`         | VARCHAR(36)  | PRIMARY KEY |
| `title`      | VARCHAR(255) | NOT NULL    |
| `venue`      | VARCHAR(255) | NOT NULL    |
| `event_time` | TIMESTAMP    | NOT NULL    |

### `seats` Table

| Column Name  | Data Type   | Constraints                                 |
| :----------- | :---------- | :------------------------------------------ |
| `id`         | VARCHAR(36) | PRIMARY KEY                                 |
| `event_id`   | VARCHAR(36) | FOREIGN KEY references `events(id)`         |
| `seat_label` | VARCHAR(10) | NOT NULL                                    |
| `version`    | INT         | NOT NULL DEFAULT 1 (For Optimistic Locking) |

### `orders` Table

| Column Name  | Data Type   | Constraints                         |
| :----------- | :---------- | :---------------------------------- |
| `id`         | VARCHAR(36) | PRIMARY KEY                         |
| `user_id`    | VARCHAR(36) | FOREIGN KEY references `users(id)`  |
| `event_id`   | VARCHAR(36) | FOREIGN KEY references `events(id)` |
| `status`     | VARCHAR(20) | NOT NULL (PENDING, PAID, EXPIRED)   |
| `created_at` | TIMESTAMP   | NOT NULL                            |

---

## 5. Preventing Double-Booking

To eliminate race conditions where two users attempt to purchase the exact same seat simultaneously, we leverage database-level constraints and memory-cache atomicity.

### In-Memory Distributed Locks (Redis)

Before touching the primary database, seat availability is evaluated in Redis using an atomic transaction.

1. When a user selects a seat, the system runs a Redis `SETNX` (Set if Not Exists) command:
   `SET event:9982:seat:A1 user_4545 EX 600 NX`
2. If this returns `1`, the user successfully secures a 10-minute hold. If it returns `0`, the seat is already locked, and the transaction is safely aborted before hitting the disk.

### Database Constraints and Transactions

If the Redis lock is verified, a transactional multi-row database write updates the status:

1. We run the operations inside a strict **ACID Database Transaction** (`BEGIN ... COMMIT`).
2. We employ **Optimistic Concurrency Control (OCC)** using the `version` column in our `seats` table:
   ```sql
   UPDATE seats
   SET status = 'RESERVED', version = version + 1
   WHERE id = 'ST-A1' AND version = 1;
   ```
3. If another query updated the row first, the version would be `2`, the update statement would affect `0` rows, and the system would safely roll back the transaction, letting the user know the seat is no longer available.

---

## 6. Architecture & Scalability Strategy

### Structural Blueprint

[ Users (Mobile / Web) ]
│
▼
[ Nginx Load Balancer ]
│
┌──────┴──────┐
▼ ▼
[ App Server ] [ App Server ] <-- Node.js / Express
│ │
├─────────────┴──────┐
▼ ▼
[ Redis Cache ] [ RabbitMQ Queue ]
(Seat Locks & (M-Pesa Checkout
Fast Browsing) Processing)
│ │
└─────────────┬──────┘
▼
[ PostgreSQL Database ]
(Users & Paid Orders)

### Surviving the Big Sale High-Load

- **Stateless Horizontal Scaling:** The application servers run inside Docker containers managed with auto-scaling rules. As incoming requests hit the Nginx load balancer, new containers spin up dynamically to spread the computational burden.
- **Aggressive Read Caching:** During the 10-minute peak, 90% of requests are simply browsing events and layout maps. We store the event schema and real-time seat states directly in a Redis cluster to serve reads directly out of memory, shielding PostgreSQL.
- **Asynchronous Queue-Based Checkout:** Instead of keeping an open database connection alive while waiting for the network round-trip of an external M-Pesa payment confirmation, checkout requests are offloaded into a message queue (RabbitMQ). Workers consume messages at a safe, controlled pace to update database states sequentially.

---

## 7. Architectural Trade-offs

### 1. Eventual Consistency vs. Strong Consistency

- **Choice:** We chose **Eventual Consistency** for event browsing layouts but **Strong Consistency** for seat reservations and checkouts.
- **Trade-off:** A user might occasionally view a cached seat layout that shows a seat as "available" when it was actually reserved a split-second prior. However, this protects our primary database from being completely crushed by hundreds of thousands of read hits during a flash sale. The actual absolute correctness is enforced safely when they click to hold the seat.

### 2. High Performance Memory Caching (Redis) vs. Operational Complexity

- **Choice:** Introducing Redis as a distributed lock engine over running everything directly in PostgreSQL.
- **Trade-off:** This provides incredibly fast lookups capable of easily scaling to 3,000+ RPS. The downside is added infrastructure footprint and operational overhead, as we must implement cache eviction logic and handle edge-case situations where a cache node goes down and requires recovery synchronization.
