// api/redirect.js
// Subtask 2 — URL Redirection  : GET /:code → 302 redirect or 404
// Subtask 3 — Click Analytics  : increments hit count on every successful redirect
// Subtask 4 — URL Expiration   : returns 410 Gone if URL has expired

const { isExpired } = require("../lib/helpers");
const { getEntry, incrementHits } = require("../lib/store");

module.exports = async function handler(req, res) {
  const code = (req.query && req.query.code) || "";

  if (!code) {
    return res.status(400).json({ error: "No short code provided." });
  }

  try {
    const entry = await getEntry(code);

    // Subtask 2 — Constraint 2: 404 when code does not exist
    if (!entry) {
      return res.status(404).json({
        error: `Short code "${code}" not found.`,
      });
    }

    // Subtask 4 — Constraint 2: 410 Gone if URL has expired
    if (isExpired(entry.expiresAt)) {
      return res.status(410).json({
        error:     `Short code "${code}" has expired.`,
        expiredAt: entry.expiresAt,
      });
    }

    // Subtask 3 — Constraint 1: increment click count on every successful redirect
    incrementHits(code).catch(() => {}); // fire-and-forget — don't block redirect

    // Subtask 2 — Constraint 1: 302 redirect to original URL
    res.setHeader("Location", entry.originalUrl);
    res.setHeader("Cache-Control", "no-store");
    return res.status(302).end();

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
