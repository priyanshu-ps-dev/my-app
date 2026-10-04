# Hisaab Saathi v2

Hisaab Saathi is a full-stack B2B collections intelligence workspace for turning verbal payment commitments into an actionable follow-up queue.

**Live demo:** https://promise-ledger-priyanshu.onrender.com

## Why this project exists
Small B2B teams often track payment promises in WhatsApp, spreadsheets and memory. Hisaab Saathi centralizes the commitment, due date, follow-up timeline, payment state and recovery priority in one place.

## Product capabilities
- Server-backed payment promise records
- Overdue, due-today, upcoming and collected views
- Rule-based risk scoring for every open commitment
- High-risk focus mode
- Recovery intelligence: exposure, follow-up coverage and average overdue age
- Seven-day collections velocity chart
- Smart next-best-action recommendation derived from live records
- Follow-up timeline / audit trail
- Promise-date rescheduling
- WhatsApp follow-up action
- Mark-as-collected workflow
- Search and CSV export
- Responsive mobile-first dashboard
- Offline browser-cache fallback if the API is unavailable
- Keyboard shortcuts (`N` for a new promise, `/` for search, `Ctrl/Cmd + K` for risk focus)

## Architecture

```text
Browser UI
   |
   | fetch /api/*
   v
Node.js HTTP server
   |-- REST API
   |-- validation
   |-- rate limiting
   |-- security headers
   |-- analytics aggregation
   |-- static asset serving
   v
Server-side JSON persistence adapter
```

The UI is intentionally framework-free to keep the implementation easy to inspect. The API boundary keeps storage separate from product logic, so the persistence adapter can be replaced with PostgreSQL without changing the frontend contract.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health/version/uptime |
| `GET` | `/api/promises` | List payment promises |
| `POST` | `/api/promises` | Create a promise |
| `PATCH` | `/api/promises/:id` | Update date/status/details |
| `DELETE` | `/api/promises/:id` | Delete a promise |
| `POST` | `/api/promises/:id/history` | Append a follow-up note |
| `GET` | `/api/analytics` | Seven-day collection/promise analytics |
| `POST` | `/api/reset` | Restore demo data |

## Risk engine
The risk score is deterministic and explainable rather than pretending to be AI. It combines:
- days overdue / proximity to due date
- amount at risk
- whether follow-up activity exists
- recency of the latest follow-up

This produces a 1–99 score used by priority ordering, the high-risk filter and the next-best-action card.

## Resilience and engineering details
- API request rate limiting
- request-body size limits
- input validation
- basic security headers
- serialized server writes
- API request logging
- frontend cache fallback when the backend is temporarily unavailable
- cache-busted static assets for deployment updates

## Run locally

```bash
cd promise-ledger
npm start
```

Then open:

```text
http://localhost:10000
```

## Production scaling path
The current live demo uses a lightweight server-file persistence adapter. For a production deployment I would replace that adapter with PostgreSQL, add authentication/tenant isolation, database transactions, background reminder jobs, automated tests and observability while preserving the existing REST contract.

## Stack
- Node.js
- HTML5
- CSS3
- Vanilla JavaScript
- REST API
- Render deployment
