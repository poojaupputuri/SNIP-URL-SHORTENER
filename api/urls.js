// api/urls.js — GET /api/urls
// Returns all stored URL mappings with analytics and expiry info

const { json, getBaseUrl, isExpired } = require("../lib/helpers");
const { getAllCodes, getEntry }        = require("../lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Use GET." });

  try {
    const codes = await getAllCodes();
    if (!codes.length) return json(res, 200, []);

    const entries = await Promise.all(
      codes.map(async (code) => {
        const entry = await getEntry(code);
        if (!entry) return null;
        return {
          shortCode:   code,
          shortUrl:    `${getBaseUrl(req)}/${code}`,
          originalUrl: entry.originalUrl,
          createdAt:   entry.createdAt,
          expiresAt:   entry.expiresAt ?? "never",
          expired:     isExpired(entry.expiresAt),
          hits:        entry.hits ?? 0,
        };
      })
    );

    return json(res, 200, entries.filter(Boolean));
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
};
