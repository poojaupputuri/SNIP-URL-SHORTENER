// api/shorten.js
// Subtask 1 — URL Shortening   : accepts URL, generates unique code, stores mapping
// Subtask 4 — URL Expiration   : accepts optional ttlMinutes, stores expiresAt
// Subtask 5 — Rate Limiting    : max 10 requests per IP per 60 seconds

const { generateShortCode, validateUrl, parseTTL, parseBody, json, getBaseUrl } = require("../lib/helpers");
const { setEntry, codeExists } = require("../lib/store");
const { withRateLimit } = require("../lib/ratelimit");

async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed. Use POST." });

  // Parse request body
  let body;
  try { body = await parseBody(req); }
  catch (e) { return json(res, 400, { error: e.message }); }

  // Subtask 1 — Constraint 2: validate URL before storing
  const v = validateUrl(body.url);
  if (!v.valid) return json(res, 400, { error: v.reason });

  // Subtask 4 — Constraint 1: parse and validate optional TTL
  const ttl = parseTTL(body.ttlMinutes);
  if (!ttl.valid) return json(res, 400, { error: ttl.reason });

  try {
    // Subtask 1 — Constraint 1: generate a unique short code
    const shortCode = await generateShortCode(codeExists);
    const createdAt = new Date().toISOString();

    const entry = {
      originalUrl: v.url,
      createdAt,
      hits:      0,
      expiresAt: ttl.expiresAt,   // null = never expires (Subtask 4)
    };

    await setEntry(shortCode, entry);

    const shortUrl = `${getBaseUrl(req)}/${shortCode}`;

    return json(res, 201, {
      shortCode,
      shortUrl,
      originalUrl: v.url,
      createdAt,
      expiresAt:   ttl.expiresAt ?? "never",
    });

  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}

// Subtask 5 — wrap with rate limiting middleware
module.exports = withRateLimit(handler);
