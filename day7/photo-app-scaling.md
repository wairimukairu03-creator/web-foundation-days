# SnapShare: Photo-Sharing App Scaling Plan

## 1. Assumptions & Daily Active Users (DAU)

- **Total Registered Users:** 10,000,000 (Ten million users, comparable to a major telecom or digital banking user base in Kenya).
- **Daily Active Users (DAU):** 10% of registered users = **1,000,000 (1 Million DAU)**.
- **Upload Habits:** Each DAU uploads 1 high-resolution photo per day (e.g., sharing daily scenic views from Nairobi or coastal road trips).
- **Browsing Habits:** Each DAU views 50 feed pages per day scrolling through friends' photos.
- **Media Dimensions:** Original photo average size is 2 MB. Generated thumbnail is 50 KB.

---

## 2. Quantitative Estimations (Traffic & Storage Calculations)

### A. Uploads Per Second

- **Total Daily Uploads:** 1,000,000 users × 1 photo = 1,000,000 photos/day.
- **Average Uploads/Sec:** 1,000,000 / 86,400 seconds = **~11.57 uploads/sec**.
- **Peak Uploads/Sec (5x during evening hours or Nairobi events):** 11.57 × 5 = **~57.85 uploads/sec**.

### B. Feed Views Per Second

- **Total Daily Feed Views:** 1,000,000 users × 50 pages = 50,000,000 views/day.
- **Average Views/Sec:** 50,000,000 / 86,400 seconds = **~578.70 views/sec**.
- **Peak Views/Sec (5x during viral social media trends):** 578.70 × 5 = **~2,893.50 views/sec**.

### C. Photo Storage Per Year

- **Storage per photo bundle:** 2 MB (Original) + 0.05 MB (Thumbnail) = 2.05 MB.
- **Daily Storage Required:** 1,000,000 × 2.05 MB = 2,050,000 MB = **2.05 TB/day**.
- **Yearly Storage Required:** 2.05 TB × 365 days = **748.25 TB/year**.

---

## 3. System Nature: Read-Heavy vs Write-Heavy

The system is heavily **Read-Heavy**.

- **Ratio:** 50,000,000 reads to 1,000,000 writes yields a **50:1 read-to-write ratio**.
- **Design Implications:** Because users read vastly more than they write, our infrastructure must prioritize read-optimization. We will implement extensive caching layers (Redis/Memcached) and a Content Delivery Network (CDN) to serve images closer to Kenyan internet exchanges, preventing heavy load from reaching our core database.

---

## 4. Storage Strategy: Why Databases Aren't for Photos

Photos must **never** be stored directly inside a relational database (e.g., as BLOBs).

- **The Problem:** Storing large binary files in databases causes high memory consumption, index degradation, expensive backups, and poor scaling properties. It slows down basic query execution.
- **The Solution:** Photos will be saved to an **Object Storage Service** (such as AWS S3 or a local equivalent like Safaricom Cloud object storage). Only the metadata string—the structural **URL/pointer** pointing to the object file—will live inside the SQL database.

---

## 5. System Architecture Diagram

[ User App / Client ]
|
v
[ Global CDN ] ---> (Delivers Cached Images & Thumbnails)
|
v
[ Load Balancer ]
|
+---> [ App Server Cluster ]
|
+---> [ Cache Layer (Redis) ] ---> [ Read Replica DB ]
|
+---> [ Primary Write DB ] (Stores Image Text Metadata / URLs)
|
+---> [ Object Storage ] (Stores 2MB Raw Image Files)
|
+---> [ Message Queue ] ---> [ Background Worker ] ---> (Generates 50KB Thumbnail)

## 6. Component Explanations

- **CDN (Content Delivery Network):** Caches and delivers images from edge servers near Nairobi/Mombasa to ensure low-latency loading for users.
- **Load Balancer:** Evenly distributes incoming user requests across multiple application servers to prevent any single server from becoming a bottleneck.
- **App Servers:** Hosts the core backend logic handling user authentication, feed compilation, and routing data.
- **Cache (Redis):** Stores frequently accessed user profiles and active user timelines in-memory to prevent slow database hits.
- **Primary DB (Write):** Handles structured data additions such as new likes, comments, and fresh image metadata mapping records.
- **Read Replica DB:** Replicates data from the primary instance to handle high-frequency user feed generation without stressing the write engine.
- **Object Storage:** Securely holds raw image file binaries and their compressed thumbnail counterparts cheaply at massive scale.
- **Message Queue (Kafka/RabbitMQ):** Holds background jobs asynchronously so image uploads don't block user performance waiting for post-processing.
- **Worker Pool:** Pulls background items off the queue to process operations like shrinking media and computing image aspect ratios.

---

## 7. Detailed Upload Flow (Step-by-Step)

1.  The user selects a photo on their app and presses 'Upload'.
2.  The client transmits the binary payload through the Load Balancer to an active App Server.
3.  The App Server writes the raw 2 MB file directly into the cloud Object Storage bucket and receives a unique object key.
4.  The App Server publishes a job event container `{"image_id": 999, "bucket_url": "..."}` onto the Message Queue.
5.  The App Server instantly replies to the user with a "Success" status code, keeping the user interface snappy.
6.  An isolated worker machine grabs the job from the Message Queue, downloads the original image, downscales it to a **50 KB thumbnail**, and saves that thumbnail back to Object Storage.
7.  The worker updates the relational database record to link both the original URL and thumbnail URL to the user profile metadata.

---

## 8. Architectural Trade-offs

- **Eventual Consistency vs Strong Consistency:** To scale reads, feed timelines are served from cache replicas. When a friend uploads a photo, it might take a few seconds to update across everyone's feed rather than updating instantly, which favors fast load speeds over perfect synchronization.
- **Asynchronous Thumbnail Generation:** Moving thumbnail generation to workers ensures ultra-fast upload confirmations for the user. However, if the message queue fills up or goes down, users might temporarily view a broken placeholder thumbnail in their feed until background workers catch up.
