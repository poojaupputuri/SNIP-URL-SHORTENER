// lib/ratelimit.js — Subtask 5: Rate Limiting Middleware
// Wraps any Vercel handler and enforces per-IP rate limiting.

const { checkRateLimit } = require("./store");
const { getClientIP }    = require("./helpers");

/**
 * withRateLimit(handler)
 * Wraps a Vercel serverless handler with rate limiting.
 *
 * - Extracts IP from request headers (works behind Vercel's proxy)
 * - Checks the sliding window counter in Upstash Redis
 * - Passes rate limit headers on every response
 * - Returns 429 Too Many Requests if limit is exceeded
 */
function withRateLimit(handler) {
  return async function (req, res) {
    // CORS preflight — skip rate limiting
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).end();
    }

    const ip = getClientIP(req);

    try {
      const limit = await checkRateLimit(ip);

      // Always attach rate limit headers so clients can track their usage
      res.setHeader("X-RateLimit-Limit",     limit.limit);
      res.setHeader("X-RateLimit-Remaining", limit.remaining);
      res.setHeader("X-RateLimit-Reset",     limit.resetInSec);

      // Constraint 1: 429 if limit exceeded
      if (!limit.allowed) {
        res.setHeader("Retry-After", limit.resetInSec);
        return res.status(429).json({
          error:      "Too Many Requests.",
          message:    `Limit of ${limit.limit} requests per 60 seconds exceeded.`,
          retryAfter: limit.resetInSec,
        });
      }
    } catch (e) {
      // If Redis is unavailable, fail open (don't block the request)
      console.error("[ratelimit] Redis error:", e.message);
    }

    return handler(req, res);
  };
}

module.exports = { withRateLimit };
