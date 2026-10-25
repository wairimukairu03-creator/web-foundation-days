# TicketHub: Comprehensive System Design Document

## 1. System Requirements

### Functional Requirements

- **Browse Events:** Users can search and view available concerts, artists, venues, and dates.
- **View Seats:** Users can view a real-time layout of available and occupied seats for a specific event.
- **Hold Seats:** Users can temporarily lock specific seats for 5–10 minutes while completing checkout.
- **Process Payments:** Users can securely pay for held seats via integrated payment gateways (e.g., M-Pesa).
- **View Tickets:** Users can view their purchased tickets, booking history, and unique digital ticket vouchers (QR codes).

### Non-Functional Requirements

- **Speed (Low Latency):** Page loads and seat selections must take under 200ms, even during sudden traffic spikes, to prevent user frustration.
- **Correctness (Consistency):** Strict transactional consistency is required. A seat must never be double-booked or sold to more than one user.
- **Fairness (Concurrency Control):** First-come, first-served access during flash sales. No user should be bypassed due to race conditions or system favoritism.
- **High Availability:** The system must maintain 99.99% uptime, especially the browsing and ticket retrieval paths, during high-demand sales events.

---

## 2. Traffic Analytics & Sizing Calculations

### Traffic Volume Assertions

- **Normal Baseline Traffic:** 50,000 unique active users per day.
- **Normal Interaction Load:** 50,000 users × 10 pages/user = 500,000 requests per day.
- **Normal Baseline Throughput:** 500,000 requests / 86,400 seconds ≈ **5.8 Requests Per Second (RPS)**.
- **Peak Surge Traffic ("Big Sale"):** 200,000 concurrent users competing for 20,000 highly coveted event seats.
- **Peak Dynamic Load:** Each user is assumed to refresh, click, poll, or submit checkout requests 10 times during a high-anxiety 10-minute window (600 seconds).
- **Peak Dynamic Interaction Throughput:** (200,000 users × 10 requests) / 600 seconds ≈ **3,333 RPS**.
- **The Scale Volatility:** This indicates a massive **~550x surge** over baseline operations within seconds of ticket release.

### Database Sizing Estimates

- **Data Payload Constraints:**
  - A standard `order` record (UUID, Foreign Keys, Timestamp, Status String) consumes approximately 200 bytes of structured data.
  - A final ticket voucher object with strings and metadata consumes approximately 300 bytes.
- **Peak Write Sizing Strategy:** Processing 20,000 successful ticket checkouts generates:
  - 20,000 orders × 200 bytes = 4,000,000 bytes (~4 MB).
  - 20,000 tickets × 300 bytes = 6,000,000 bytes (~6 MB).
- **Throughput Capacity Planning:** While 10 MB of cold static database writes is trivial for a relational database, processing thousands of unbuffered write requests per second _simultaneously_ will exhaust the database connection pool. The storage capacity must support continuous write bursts of **3,333 RPS** hitting transactional safety limits.

---

## 3. End-to-End Sequential Architecture Blueprint

This diagram illustrates how data flows sequentially from the user through the stack, splitting clean path execution into **Reads (High-Speed Memory Verification)** and **Writes (Asynchronous Message Queues)**.

[ Users (Web / Mobile App clients) ]
│
▼ (HTTPS / TLS Termination)
[ Edge Caching Layer (CDN / Cloudflare) ]
(Serves static assets & event media)
│
▼
[ Nginx Load Balancer ]
(Round-robin traffic distribution)
│
┌─────────────────────────┴─────────────────────────┐
▼ (HTTP API Requests) ▼
[ App Instance 1 ] [ App Instance 2 ]
(Stateless Web Tier) (Stateless Web Tier)
│ │
├───────────────────────────────────────────────────┤
▼ ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ READ PATH (High-Speed) │ │ WRITE PATH (Asynchronous) │
│ [ Redis Cache Layer ] │ │ [ RabbitMQ Message Queue ] │
│ │ │ │
│ • INPUT: Key-Value checks for │ │ • INPUT: Unprocessed order text│
│ instant seat configurations │ │ and user checkout payloads │
│ • OUTPUT: Serves layout map data│ │ • OUTPUT: Sequential buffered │
│ directly from memory (<20ms) │ │ jobs sent to backend workers │
└────────────────┬────────────────┘ └────────────────┬────────────────┘
│ │
└─────────────────────────┬─────────────────────────┘
▼
[ Worker Services ]
(Validates queue background jobs)
│
┌─────────────────────────────────┴─────────────────────────────────┐
▼ (Strict Transactional SQL Writes) ▼ (Protected HTTP/JSON)
[ PostgreSQL Relational Database ] [ External M-Pesa API Gateway ]
(Users, Finalized Bookings, Orders) (STK Push billing transaction)

---

## 4. API Design

### 1. Browse Events

- **Endpoint:** `GET /api/v1/events`
- **Query Params:** `page=1&limit=20&search=De+Matthew`
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

## 5. Relational Database Schema & Data Models

Our storage tier uses a relational schema to guarantee strong reference tracking across models.

### `users` Table

- **Purpose:** Stores customer profile configurations.

| Column Name | Data Type    | Constraints        |
| :---------- | :----------- | :----------------- |
| `id`        | VARCHAR(36)  | PRIMARY KEY (UUID) |
| `name`      | VARCHAR(100) | NOT NULL           |
| `email`     | VARCHAR(100) | UNIQUE, NOT NULL   |
| `phone`     | VARCHAR(15)  | NOT NULL           |

### `events` Table

- **Purpose:** Stores immutable show dates and venue descriptions.

| Column Name  | Data Type    | Constraints |
| :----------- | :----------- | :---------- |
| `id`         | VARCHAR(36)  | PRIMARY KEY |
| `title`      | VARCHAR(255) | NOT NULL    |
| `venue`      | VARCHAR(255) | NOT NULL    |
| `event_time` | TIMESTAMP    | NOT NULL    |

### `seats` Table

- **Purpose:** Tracks seat coordinate availability. High throughput reads mirror this schema inside memory strings.

| Column Name  | Data Type   | Constraints                                |
| :----------- | :---------- | :----------------------------------------- |
| `id`         | VARCHAR(36) | PRIMARY KEY                                |
| `event_id`   | VARCHAR(36) | FOREIGN KEY references `events(id)`        |
| `seat_label` | VARCHAR(10) | NOT NULL                                   |
| `status`     | VARCHAR(20) | NOT NULL DEFAULT 'AVAILABLE'               |
| `version`    | INT         | NOT NULL DEFAULT 1 (Optimistic Lock Field) |

### `orders` Table

- **Purpose:** Captures the core billing transaction state linked to payment confirmations.

| Column Name  | Data Type   | Constraints                         |
| :----------- | :---------- | :---------------------------------- |
| `id`         | VARCHAR(36) | PRIMARY KEY                         |
| `user_id`    | VARCHAR(36) | FOREIGN KEY references `users(id)`  |
| `event_id`   | VARCHAR(36) | FOREIGN KEY references `events(id)` |
| `status`     | VARCHAR(20) | NOT NULL (PENDING, PAID, EXPIRED)   |
| `created_at` | TIMESTAMP   | NOT NULL                            |

---

## 6. Concurrency Control: Preventing Double-Booking

To securely manage 3,333 RPS competing for identical records without double-booking, the application relies on an explicit, two-layered isolation process.

### Step 1: Atomic In-Memory Locks (Redis)

Before a request can reach the primary disk database, the application server attempts to claim an atomic key inside Redis using the `SETNX` (Set if Not Exists) directive:SET event:9982:seat:A1 user_4545 EX 600 NX

- **Success (Returns 1):** The user receives a temporary 10-minute hold window.
- **Failure (Returns 0):** The seat is already claimed. The transaction stops immediately and returns a "Seat Held" state to the client without placing any write load on our persistent database.

### Step 2: Optimistic Concurrency Control (OCC)

When the user completes payment, our worker processes the transaction. To prevent a race condition without slowing down the database with massive row locks, we use **Optimistic Locking** via the `version` column:

```sql
UPDATE seats
SET status = 'RESERVED', version = version + 1
WHERE id = 'ST-A1' AND version = 1;
```

If two requests bypass Redis simultaneously due to a cache connection reset, only the first statement executed will find `version = 1` and alter the row. The second statement will find `version = 2`, modify `0` rows, and trigger an explicit transactional rollback to safely reject the duplicate booking.

---

## 7. Third-Party Integration Risk Management

Integrating external systems like the **M-Pesa API Gateway** introduces unpredictable network latencies. If the M-Pesa platform experiences slow performance, client request threads can easily become blocked waiting for responses, causing a complete system outage. We protect TicketHub using three software safety patterns

[ Incoming Payment ] ──> [ Circuit Breaker (CLOSED) ] ──> [ Async Worker Task ] ──> [ M-Pesa API ]
│ (If failures > 50%)
▼
[ Circuit Breaker (OPEN) ] ──> [ Graceful Fallback / Instant Error ]

### 1. The Circuit Breaker Pattern

We wrap our outbound HTTP requests to the payment API inside a circuit breaker middleware (e.g., using open-source libraries like `Opossum` or custom tracking state variables).

- **Normal Mode (Closed):** Requests stream out normally to M-Pesa.
- **Failure Mode (Open):** If our outbound calls to M-Pesa fail or time out more than 50% of the time over a 30-second window, the circuit breaker trips **OPEN**.
- **Protection:** For the next 60 seconds, all subsequent checkout payments fail instantly at our application boundary _without_ waiting for M-Pesa or exhausting server memory. This keeps our application server responsive for users who are simply trying to browse events or view their existing tickets.

### 2. Idempotent Message Deduplication

M-Pesa uses asynchronous STK Push callbacks to confirm successful transactions. If network noise causes their system to send duplicate webhook notifications for a single transaction, our application could generate duplicate tickets. We eliminate this risk by enforcing strict database idempotency:

- Every payment payload contains a unique `CheckoutRequestID`.
- We track these identifiers inside an idempotent database ledger. If a callback arrives with a `CheckoutRequestID` that has already been marked as processed, our server completely ignores the duplicate database write and returns a `200 OK` response to the payment gateway.

### 3. Asynchronous Worker Timeouts & Retries

Outbound API requests use explicit, short connection timeouts capped at **5000ms**. If an API callback fails due to a temporary dropped packet, the task is dropped back into a retry queue in RabbitMQ with an exponential backoff strategy (retrying after 2, 4, then 8 minutes) rather than keeping an active user HTTP thread open and waiting.

---

## 8. Architectural Trade-offs & Structural Decisions

### 1. Monolithic Shared Database vs. Microservice Storage Isolation

- **Decision:** We chose a single, shared relational database cluster over decoupled microservice databases.
- **Trade-off:** Microservices with isolated databases look excellent on paper but introduce distributed transaction nightmares. If the ticket service and the user billing service were on isolated databases, ensuring both update simultaneously requires complex two-phase commits. A shared database allows us to use standard, highly reliable ACID transactions. The trade-off is operational—our database becomes a single point of failure that requires vertical hardware scaling.

### 2. Eventual Consistency (Browsing) vs. Strong Consistency (Checkout)

- **Decision:** Eventual consistency across search pages, strong consistency for seat configurations.
- **Trade-off:** Serving event search matrices from Redis cache layouts means a user might see a seat as open when it was actually reserved 5 seconds ago. This slight accuracy trade-off is acceptable because it allows us to handle 3,333 RPS effortlessly. Absolute strong consistency is safely enforced the millisecond they try to claim the lock.
