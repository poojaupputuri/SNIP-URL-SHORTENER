// lib/store.js — Upstash Redis via plain fetch (zero npm dependencies)
// Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

async function redis(command, ...args) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars.");
  const res  = await fetch(`${url}/${[command, ...args].map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// ── Subtask 1: Store a new URL entry ──────────────────────────────────────────
async function setEntry(code, entry) {
  await redis("SET", `url:${code}`, JSON.stringify(entry));
  await redis("ZADD", "all_codes", Date.now(), code);
}

// ── Subtask 1 & 2: Get a URL entry ───────────────────────────────────────────
async function getEntry(code) {
  const raw = await redis("GET", `url:${code}`);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// ── Subtask 1: Check if code exists ──────────────────────────────────────────
async function codeExists(code) {
  const raw = await redis("EXISTS", `url:${code}`);
  return raw === 1;
}

// ── Subtask 1: Get all codes newest first ─────────────────────────────────────
async function getAllCodes() {
  const result = await redis("ZRANGE", "all_codes", "0", "-1", "REV");
  return Array.isArray(result) ? result : [];
}

// ── Subtask 3: Increment click count ─────────────────────────────────────────
async function incrementHits(code) {
  const entry = await getEntry(code);
  if (!entry) return;
  entry.hits = (entry.hits || 0) + 1;
  await redis("SET", `url:${code}`, JSON.stringify(entry));
}

// ── Subtask 5: Rate limiting ──────────────────────────────────────────────────
// Uses a sliding window counter per IP stored in Redis with a TTL
const RATE_LIMIT   = 10;   // max requests
const WINDOW_SECS  = 60;   // per 60 seconds

async function checkRateLimit(ip) {
  const key     = `rate:${ip}`;
  const current = await redis("INCR", key);
  if (current === 1) {
    // First request in this window — set expiry
    await redis("EXPIRE", key, WINDOW_SECS);
  }
  const ttl = await redis("TTL", key);
  return {
    allowed:   current <= RATE_LIMIT,
    current,
    limit:     RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - current),
    resetInSec: ttl,
  };
}

module.exports = { setEntry, getEntry, codeExists, getAllCodes, incrementHits, checkRateLimit };
