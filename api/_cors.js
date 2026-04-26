/**
 * Shared CORS allowlist for all API endpoints.
 * Checks request origin against allowed domains and sets headers accordingly.
 */

const ALLOWED_ORIGINS = [
  "https://everywherestudio.ai",
  "https://www.everywherestudio.ai",
  "https://everywherestudio-one.vercel.app",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Vercel preview deployments: any *.vercel.app subdomain
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  // Local development: any localhost port
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

/**
 * Set CORS headers on the response based on the request origin.
 * If the origin is in the allowlist, echoes it back. Otherwise omits the header.
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers?.origin || "";
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
