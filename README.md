# ReachInbox Email Job Scheduler & Dashboard

A production-grade, distributed asynchronous email scheduler service and analytics dashboard built for high-throughput cold outreach campaigns.

Built with **Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL (Prisma ORM), Nodemailer (Ethereal fake SMTP), Elasticsearch, and React (Vite + Tailwind CSS)**.

---

## 📑 Table of Contents
- [Architecture Overview](#architecture-overview)
  - [1. Scheduling & BullMQ Engine](#1-scheduling--bullmq-engine)
  - [2. Persistence & Crash Recovery](#2-persistence--crash-recovery)
  - [3. Concurrency, Rate Limiting & Throttling](#3-concurrency-rate-limiting--throttling)
  - [4. Elasticsearch Indexing & Search](#4-elasticsearch-indexing--search)
  - [5. Slack Integration](#5-slack-integration)
- [Feature Checklist](#feature-checklist)
- [Quick Start Guide](#quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Design Decisions & Trade-Offs](#design-decisions--trade-offs)
- [Testing & Verification](#testing--verification)

---

## Architecture Overview

```
                      +-----------------------------+
                      |   React + Tailwind Frontend |
                      |    (Port 5173 / Vite + TS)  |
                      +--------------+--------------+
                                     |  HTTP / REST
                                     v
                      +-----------------------------+
                      |   Express + TypeScript API  |  <---> [ Bull-Board Dashboard ]
                      |         (Port 5000)         |         (/admin/queues)
                      +-------+-------------+-------+
                              |             |
           +------------------+             +--------------------+
           v                                                     v
+---------------------+                               +---------------------+
| PostgreSQL (Prisma) |                               | Redis 7 (SortedSet) |
| Source of truth for |                               | Persistent BullMQ   |
| emails & audit logs |                               | delayed job queue   |
+---------------------+                               +----------+----------+
           ^                                                     |
           |                  +---------------------+            |
           +------------------+    BullMQ Worker    | <----------+
       State update           |  (Concurrency: 5)   |
  (PROCESSING -> SENT)        +----------+----------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             +--------------------+              +--------------------+
             | Ethereal SMTP Fake |              | Slack Rate-Limit   |
             | Email Delivery     |              | Webhook Alert      |
             +--------------------+              +--------------------+
```

### 1. Scheduling & BullMQ Engine
- **No Cron Jobs:** Standard cron jobs poll the entire database periodically, causing race conditions, database thrashing under load, and high latency. This system relies on **BullMQ delayed jobs** backed by Redis Sorted Sets (`ZSET`).
- When a campaign is scheduled via `POST /api/emails/schedule`:
  1. Records are inserted into PostgreSQL with status `SCHEDULED`.
  2. For batches, each successive lead is staggered by `delayBetweenEmailsSeconds` (e.g. `startTime + index * delay`).
  3. Jobs are queued in BullMQ with `delay = Math.max(0, scheduledAt - Date.now())`.
  4. Each job uses `jobId = email.id`, enforcing **strict idempotency**. BullMQ ignores duplicate additions with identical job IDs.

### 2. Persistence & Crash Recovery
- **Surviving Restarts:**
  - Redis persists delayed jobs in its append-only file (AOF) / RDB snapshot.
  - On backend startup, the boot sequence runs `reconcileScheduledJobsOnBoot()`:
    1. Scans PostgreSQL for emails with status `SCHEDULED`, `PENDING`, or `RATE_LIMITED` where `sentAt IS NULL`.
    2. Queries BullMQ using `emailQueue.getJob(email.id)`.
    3. If Redis lost a job (or during a failover), the service re-enqueues it with the remaining delay (`Math.max(0, scheduledAt - now)`).
    4. If the scheduled time elapsed while the server was down, the delay is `0`, causing the email to dispatch immediately upon reboot without losing records or restarting the campaign from scratch.

### 3. Concurrency, Rate Limiting & Throttling
- **Configurable Worker Concurrency:** BullMQ worker concurrency is set via `WORKER_CONCURRENCY` (default: `5`).
- **Provider Throttling Delay:** To prevent SMTP connection flooding, `DELAY_BETWEEN_EMAILS_SECONDS` (default: 2 seconds) is enforced per sender via Redis key `delay:last_sent:<senderId>`. When concurrent workers pick up jobs for the same sender, subsequent jobs await the remaining threshold.
- **Hourly Rate Limiting:**
  - Backed by an atomic Redis Lua script:
    ```lua
    local current = tonumber(redis.call('GET', key) or "0")
    if current >= limit then return {0, current} end
    current = redis.call('INCR', key)
    if current == 1 then redis.call('EXPIRE', key, ttl) end
    return {1, current}
    ```
  - Counters are partitioned by sender and UTC hour window: `ratelimit:sender:<senderId>:<YYYY-MM-DD-HH>`.
  - **Zero Job Dropping:** When the quota is reached, jobs are **never dropped or failed**. Instead, the remaining delay until the next UTC hour window is computed, the database status updates to `RATE_LIMITED`, and the job is rescheduled into BullMQ for the next window preserving batch order.

### 4. Elasticsearch Indexing & Search
- Integrated with `@elastic/elasticsearch`.
- Emails are indexed on creation and status updates (`status`, `recipient`, `subject`, `body`, `senderEmail`, `scheduledAt`, `sentAt`).
- The frontend search bar queries `POST /api/emails/search` using multi-field fuzzy matching (`multi_match` over `recipient^3`, `subject^2`, `body`).
- **Resilient Fallback:** If Elasticsearch is not running locally, the search service transparently queries PostgreSQL with ILIKE filters so dashboard operations remain uninterrupted.

### 5. Slack Integration
- Real Slack OAuth and Incoming Webhook support.
- Configurable per user/tenant in database (`slackWebhookUrl` or `slackAccessToken`).
- The instant a sender reaches their hourly rate limit, a live formatted Slack alert is dispatched displaying:
  - Sender name and email
  - Hourly quota and current count
  - Next delivery window time
  - Confirmation that remaining jobs are postponed rather than dropped.
- **Disconnect / Reconnect Safety:** If Slack is not connected, rate limit events log silently without crashing workers; connecting Slack immediately activates live alerts without server redeploys.

---

## Feature Checklist

| Requirement | Implementation | Status |
| :--- | :--- | :--- |
| **No Cron Jobs** | BullMQ delayed jobs (`ZSET`) with millisecond precision | Complete |
| **Relational DB** | PostgreSQL managed via Prisma ORM | Complete |
| **Fake SMTP** | Nodemailer with Ethereal Email + live web preview links | Complete |
| **Persistence across restarts** | Redis persistence + startup DB reconciliation sync | Complete |
| **Idempotent queues** | `jobId: email.id` BullMQ uniqueness | Complete |
| **Configurable Concurrency** | Configurable BullMQ worker threads via `WORKER_CONCURRENCY` | Complete |
| **Delay Between Emails** | Configurable per-sender minimum delay (e.g. 2s) via Redis | Complete |
| **Hourly Rate Limiting** | Atomic Redis Lua counters per sender per hour window | Complete |
| **Rescheduling on Limit Hit** | Postponed to start of next hour window without dropping | Complete |
| **Live Slack Alert** | Slack Webhook / OAuth notification triggered on limit hit | Complete |
| **Elasticsearch** | Elasticsearch indexer + fuzzy multi-match search + DB fallback | Complete |
| **BullMQ Live Board** | Embedded `@bull-board/express` dashboard on `/admin/queues` | Complete |
| **Google Login** | Real Google OAuth / GIS integration + session management | Complete |
| **Figma Dashboard** | Dark-themed ReachInbox dashboard with status pills & tabs | Complete |
| **Compose & CSV Upload** | CSV/TXT lead parser detecting & counting valid emails | Complete |
| **Scheduled & Sent Tables** | Paginated tables with search, cancel, and Ethereal preview | Complete |

---

## Quick Start Guide

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose (or local Redis + PostgreSQL)

### Environment Configuration

#### Backend `.env` (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/reachinbox"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

WORKER_CONCURRENCY=5
DELAY_BETWEEN_EMAILS_SECONDS=2
MAX_EMAILS_PER_HOUR_PER_SENDER=50

ELASTICSEARCH_NODE=http://localhost:9200

# Optional: Real Google Client ID & Slack Webhook
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_DEFAULT_WEBHOOK=

# Ethereal Email: auto-generated on first boot if blank
ETHEREAL_USER=
ETHEREAL_PASS=

FRONTEND_URL=http://localhost:5173
```

#### Frontend `.env` (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

---

### Running with Docker Compose
To launch PostgreSQL, Redis, and Elasticsearch in isolated containers:
```bash
docker compose up -d
```

### Running Locally

1. **Install backend dependencies and run database migrations:**
   ```bash
   cd backend
   npm install
   npx prisma db push
   ```

2. **Start the backend server & email worker:**
   ```bash
   npm run dev
   ```
   *The server will boot on `http://localhost:5000` and mount the BullMQ dashboard at `http://localhost:5000/admin/queues`.*

3. **Install frontend dependencies and start Vite:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *The dashboard will be available at `http://localhost:5173`.*

---

## API Reference

### Scheduling & Email APIs
- `POST /api/emails/schedule` — Schedule an email or batch campaign.
  ```json
  {
    "senderId": "uuid",
    "recipients": ["lead1@example.com", "lead2@example.com"],
    "subject": "Introductory ReachInbox Campaign",
    "body": "<p>Hello from ReachInbox</p>",
    "startTime": "2026-11-03T12:00:00Z",
    "delayBetweenEmailsSeconds": 2,
    "hourlyLimit": 50
  }
  ```
- `POST /api/emails/upload-leads` — Upload CSV / TXT lead file (multipart `file`).
- `GET /api/emails/scheduled?q=&page=&limit=` — List scheduled & rate-limited emails.
- `GET /api/emails/sent?q=&page=&limit=` — List delivered emails with preview URLs.
- `GET /api/emails/search?q=` — Elasticsearch search across subject, recipient, body.
- `DELETE /api/emails/:id` — Cancel and delete scheduled email from BullMQ queue.

### Sender Management
- `GET /api/senders` — List registered sender accounts with real-time remaining quota.
- `POST /api/senders` — Register a new sender account.
- `PUT /api/senders/:id` — Update sender hourly limit or delay.

### Slack Integration
- `GET /api/slack/status` — Get Slack connection status.
- `POST /api/slack/webhook` — Connect Slack Incoming Webhook URL.
- `POST /api/slack/test` — Trigger live verification test message.
- `DELETE /api/slack/disconnect` — Disconnect Slack integration.

---

## Design Decisions & Trade-Offs

1. **BullMQ Delayed Jobs vs. Cron:**
   - *Decision:* Used BullMQ's native delayed job scheduling instead of recurring cron checks.
   - *Rationale:* Cron jobs poll on intervals (e.g., every 60s), resulting in dispatch jitter and database lock contention. BullMQ uses Redis Sorted Sets where the score is the scheduled timestamp, allowing workers to atomically pop jobs precisely when due.

2. **Per-Sender Redis Counters vs. Database Counters:**
   - *Decision:* Implemented rate limiting using Redis atomic Lua scripts rather than SQL `COUNT(*)` queries.
   - *Rationale:* Under high concurrency across multiple worker processes, executing `SELECT COUNT(*) FROM emails WHERE senderId = ... AND sentAt > ...` causes heavy read amplification and race conditions. Redis atomic increments provide `O(1)` performance with zero race conditions.

3. **Reconciliation on Boot vs. Total Redis Trust:**
   - *Decision:* Added an explicit database reconciliation routine on server startup.
   - *Rationale:* While Redis is persistent, network partitions or Redis restarts could lead to orphaned scheduled records in PostgreSQL. The startup sync guarantees 100% crash recovery and queue alignment without duplicate sends.

---

## Testing & Verification

1. **Lead File Upload:**
   - Use `leads-sample.csv` or `leads-bulk.txt` located in the root directory to test drag-and-drop lead parsing.
2. **Crash Recovery Demonstration:**
   - Schedule an email 20 seconds into the future.
   - Stop the backend process (`Ctrl+C`).
   - Start the backend again (`npm run dev`).
   - Observe in the console that the job is detected and sent at the exact scheduled second with an Ethereal preview URL.
3. **Rate Limit & Slack Demonstration:**
   - Open Slack modal and configure your incoming webhook URL.
   - Select or create a sender with an hourly limit of `2`.
   - Schedule 4 emails.
   - The first 2 emails will dispatch immediately; the 3rd and 4th will transition to `RATE_LIMITED`, reschedule to the next window, and trigger an alert to your Slack channel.
