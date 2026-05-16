# SNIP — URL Shortener

A production-ready URL shortening service implementing all 5 subtasks. Built with Node.js, deployed on Vercel, powered by Upstash Redis.

---

## Live Demo
> https://snip-application.vercel.app/

---

## Subtasks Implemented

| # | Feature | Endpoint |
|---|---------|----------|
| 1 | URL Shortening | `POST /api/shorten` |
| 2 | URL Redirection | `GET /:code` |
| 3 | Click Analytics | `GET /api/analytics/:code` |
| 4 | URL Expiration | `POST /api/shorten` with `ttlMinutes` |
| 5 | Rate Limiting | Applied on `POST /api/shorten` |

---

## API Reference

### Subtask 1 — POST `/api/shorten`
Validates and shortens a URL. Generates a guaranteed-unique 7-character code.

**Request**
```json
{
  "url": "https://example.com/very/long/path",
  "ttlMinutes": 60
}
```
> `ttlMinutes` is optional. Omit it for a link that never expires.

**Response 201**
```json
{
  "shortCode":   "aB3xY7z",
  "shortUrl":    "https://your-app.vercel.app/aB3xY7z",
  "originalUrl": "https://example.com/very/long/path",
  "createdAt":   "2024-01-01T00:00:00.000Z",
  "expiresAt":   "2024-01-01T01:00:00.000Z"
}
```

**Response 400** — validation error
```json
{ "error": "Malformed URL. Try: https://example.com" }
```

**Response 429** — rate limit exceeded (Subtask 5)
```json
{
  "error":      "Too Many Requests.",
  "message":    "Limit of 10 requests per 60 seconds exceeded.",
  "retryAfter": 45
}
```

---

### Subtask 2 — GET `/:code`
Redirects to the original URL.

| Scenario | Response |
|----------|----------|
| Code found, not expired | `302 Found` + `Location` header |
| Code not found | `404 Not Found` |
| Code expired | `410 Gone` (Subtask 4) |

---

### Subtask 3 — GET `/api/analytics/:code`
Returns total click count for a short code.

**Response 200**
```json
{
  "shortCode":   "aB3xY7z",
  "originalUrl": "https://example.com/...",
  "hits":        42,
  "createdAt":   "2024-01-01T00:00:00.000Z",
  "expiresAt":   "never"
}
```

---

### Subtask 4 — URL Expiration
Pass `ttlMinutes` when creating a link. Once expired:
- `GET /:code` returns `410 Gone`
- The link shows as expired in the dashboard

---

### Subtask 5 — Rate Limiting
Applied on `POST /api/shorten` per IP address.
- **Limit:** 10 requests per 60 seconds
- **Headers returned:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Exceeded:** `429 Too Many Requests` with `Retry-After` header

---

### GET `/api/urls`
Returns all stored links with analytics and expiry info.

---

## How It Works

```
POST /api/shorten
  → Rate limit check (Subtask 5)
  → Validate URL (Subtask 1)
  → Parse TTL / expiresAt (Subtask 4)
  → Generate unique 7-char code (Subtask 1)
  → Store in Upstash Redis
  → Return shortUrl

GET /:code
  → Look up in Redis
  → Not found → 404 (Subtask 2)
  → Expired  → 410 (Subtask 4)
  → Found    → increment hits (Subtask 3) → 302 redirect (Subtask 2)

GET /api/analytics/:code
  → Look up in Redis
  → Return { hits, ... } (Subtask 3)
```

---

## Project Structure

```
├── api/
│   ├── shorten.js      Subtask 1 + 4 + 5
│   ├── redirect.js     Subtask 2 + 3 + 4
│   ├── analytics.js    Subtask 3
│   └── urls.js         List all links
├── lib/
│   ├── helpers.js      Validation, code gen, TTL, utilities
│   ├── store.js        Upstash Redis via fetch (zero SDK)
│   └── ratelimit.js    Rate limiting middleware (Subtask 5)
├── public/
│   └── index.html      Frontend UI
├── vercel.json         Routing config
└── package.json
```

---

## Deployment

### 1. Get free Upstash Redis
1. Go to [upstash.com](https://upstash.com) → Sign up free
2. Create Database → Redis → Create
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the **REST API** section

### 2. Deploy to Vercel
1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Go to **Settings → Environment Variables**, add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. **Deployments → Redeploy**
