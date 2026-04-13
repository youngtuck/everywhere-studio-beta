# EVERYWHERE Studio Security Audit
**Last Updated:** March 19, 2026
**Scope:** Full codebase (api/, src/, config)

---

## Summary

| Category | Status |
|----------|--------|
| Admin API authentication | SECURE - JWT token + is_admin check |
| Client-side data queries | SECURE - all filtered by user_id via RLS |
| Service role key isolation | SECURE - only in api/ routes, never in src/ |
| SQL injection | SECURE - all queries use Supabase SDK (parameterized) |
| XSS via dangerouslySetInnerHTML | SECURE - no usage found |
| Unvalidated redirects | SECURE - all hardcoded same-origin routes |
| eval/Function injection | SECURE - no usage found |
| .env secrets | SECURE - .gitignore properly configured |
| Security headers | SECURE - X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| Input sanitization | IMPROVED - admin endpoints and upload now sanitized |

---

## Protections In Place

1. **Admin panel** - JWT token verification + `is_admin` flag check on every request
2. **Client queries** - All Supabase queries filtered by authenticated `user.id`
3. **Service role key** - Only used in `api/` serverless functions, never in frontend code
4. **Supabase anon key** - Client-side usage is by design (RLS restricts access)
5. **Cron security** - `CRON_SECRET` bearer token required for sentinel-cron
6. **Session persistence** - 2-hour expiry, cleared on logout
7. **File uploads** - 10MB size limit enforced via Vercel config
8. **Security headers** - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
9. **Input sanitization** - Admin code creation, resource uploads: trimmed, length-limited, HTML stripped

---

## Known Accepted Risks (Alpha Phase)

### Hardcoded access code fallback
**Files:** api/validate-access-code.js, src/pages/AuthPage.tsx, src/components/ProtectedRoute.tsx
The string "oneidea" exists as a fallback when the access_codes table is unavailable. Moved to `FALLBACK_ACCESS_CODE` env var with "oneidea" as default.
**Status:** ACCEPTED FOR ALPHA. Remove fallback before public beta.

### Public API endpoints
**Files:** api/chat.js, api/generate.js, api/visual.js, api/score.js, api/voice-dna.js, api/run-pipeline.js
These endpoints accept requests without verifying auth tokens. They call external APIs (Anthropic, Gemini) which incur costs.
**Mitigated by:** Invite-only alpha, Vercel function limits, Anthropic rate limits.
**Status:** ACCEPTED FOR ALPHA. Add JWT auth before beta.

### No rate limiting
No explicit rate limiting on public API endpoints.
**Mitigated by:** Vercel built-in protections, invite-only access.
**Status:** DEFERRED. Implement before scaling past 50 users.

---

## Fixes Applied

### Pass 1 (March 18, 2026)
1. `api/validate-access-code.js` - Hardcoded "oneidea" moved to `FALLBACK_ACCESS_CODE` env var
2. `api/sentinel-generate.js` - Input sanitization: userName trimmed to 200 chars, topics to 100 chars
3. Verified `.gitignore` includes `.env` files

### Pass 2 (March 19, 2026)
4. `vercel.json` - Added security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
5. `api/admin-data.js` - Added `sanitize()` function; code creation endpoints now trim and length-limit all string inputs
6. `api/upload-resource.js` - Added sanitization for title (200 chars), description (200 chars), content (100K chars), resource_type (50 chars)

---

## Pre-Beta Checklist

- [ ] Remove all hardcoded "oneidea" fallback code
- [ ] Add Bearer token auth to: chat.js, generate.js, score.js, visual.js, voice-dna.js, run-pipeline.js
- [ ] Add userId verification (token owner == requested userId) to: sentinel-generate.js, upload-resource.js
- [ ] Implement rate limiting (per-IP or per-user) on all Claude/Gemini API routes
- [ ] Add file type validation to upload-resource.js (restrict to .txt, .md, .pdf, .doc, .docx)
- [ ] Audit and test all RLS policies in Supabase dashboard
- [ ] Add CSP header (Content-Security-Policy) once all external resources are catalogued
- [ ] Review and restrict CORS (currently allows all origins)
