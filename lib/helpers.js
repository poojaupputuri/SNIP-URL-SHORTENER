// lib/helpers.js — shared utilities across all subtasks
const crypto = require("crypto");

// ── Subtask 1: Unique short code generation ───────────────────────────────────
async function generateShortCode(existsFn) {
  const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    const bytes = crypto.randomBytes(7);
    code = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join("");
  } while (await existsFn(code));
  return code;
}

// ── Subtask 1: URL validation ─────────────────────────────────────────────────
function validateUrl(raw) {
  if (!raw || typeof raw !== "string") return { valid: false, reason: "URL must be a non-empty string." };
  const trimmed = raw.trim();
  if (!trimmed.length)       return { valid: false, reason: "URL cannot be blank." };
  if (trimmed.length > 2048) return { valid: false, reason: "URL exceeds 2048 characters." };
  let parsed;
  try { parsed = new URL(trimmed); } catch { return { valid: false, reason: "Malformed URL. Try: https://example.com" }; }
  if (!["http:", "https:"].includes(parsed.protocol)) return { valid: false, reason: `Protocol "${parsed.protocol}" not supported.` };
  if (!parsed.hostname) return { valid: false, reason: "URL must have a valid hostname." };
  if (["localhost","127.0.0.1","0.0.0.0","::1"].includes(parsed.hostname)) return { valid: false, reason: "Local URLs cannot be shortened." };
  return { valid: true, url: trimmed };
}

// ── Subtask 4: TTL / expiration parsing ───────────────────────────────────────
// ttlMinutes: optional number (e.g. 60 = expires in 60 minutes)
function parseTTL(ttlMinutes) {
  if (ttlMinutes === undefined || ttlMinutes === null || ttlMinutes === "") {
    return { valid: true, expiresAt: null }; // no expiry
  }
  const n = Number(ttlMinutes);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, reason: "ttlMinutes must be a positive number." };
  }
  if (n > 525600) { // max 1 year
    return { valid: false, reason: "ttlMinutes cannot exceed 525600 (1 year)." };
  }
  const expiresAt = new Date(Date.now() + n * 60 * 1000).toISOString();
  return { valid: true, expiresAt };
}

// ── Subtask 4: Expiry check ───────────────────────────────────────────────────
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(status).json(body);
}

function getBaseUrl(req) {
  const host = req.headers.host || "localhost";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

module.exports = { generateShortCode, validateUrl, parseTTL, isExpired, parseBody, json, getBaseUrl, getClientIP };
