// api/analytics.js
// Subtask 3 — Click Analytics
// GET /api/analytics/:code → returns total click count for a short code
//
// Constraint 1: click count increments on every successful redirect (handled in redirect.js)
// Constraint 2: this endpoint retrieves the total click count for a given short code

const { getEntry } = require("../lib/store");
const { json }     = require("../lib/helpers");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Use GET." });

  const code = (req.query && req.query.code) || "";

  if (!code) return json(res, 400, { error: "Short code is required." });

  try {
    const entry = await getEntry(code);

    if (!entry) {
      return json(res, 404, { error: `Short code "${code}" not found.` });
    }

    return json(res, 200, {
      shortCode:   code,
      originalUrl: entry.originalUrl,
      hits:        entry.hits ?? 0,
      createdAt:   entry.createdAt,
      expiresAt:   entry.expiresAt ?? "never",
    });

  } catch (e) {
    return json(res, 500, { error: e.message });
  }
};
