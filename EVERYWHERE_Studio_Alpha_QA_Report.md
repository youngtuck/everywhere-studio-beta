# EVERYWHERE Studio: Alpha QA Report

**Date:** April 3, 2026
**Reviewer:** Claude (Cowork)
**Scope:** Full codebase audit, live deployment review, brand compliance check
**Build status:** Vite production build passes. One TypeScript error (non-blocking).

---

## Executive Summary

The site builds and deploys. The architecture is solid: React 18 + Vite + Supabase + Vercel serverless functions, with a well-structured agent pipeline. The landing page signal field animation is genuinely impressive. But there are a handful of issues that need fixing before you put this in front of anyone who matters, and a few that are urgent from a security standpoint.

**Sorted by "fix this now" priority:**

1. Brand numbers are wrong in three places (people will notice)
2. Hardcoded access code "oneidea" is a security hole
3. "Orchestrated" language appears where "Composed" should be
4. The word "vibe" is all over VisualWrap (your own rules say no)
5. Several API endpoints have no auth checks
6. One TypeScript error in Workbench.tsx

---

## 1. Brand Number Mismatches (Fix Before Launch)

These are the canonical numbers per the brand system: **40 specialists, 12 formats, 7 gates.** Here is what the site actually shows:

| Location | What it says | What it should say |
|---|---|---|
| `StatsBar.tsx` line 3 | **10** Output Formats | **12** |
| `StatsBar.tsx` line 4 | **8** Quality Checkpoints | **7** |
| `TwelveFormats.tsx` line 18 | "10 Output Formats" | "12 Output Formats" |
| `TwelveFormats.tsx` FORMATS array | Only **10** items listed | Needs **12** items |
| `constants.ts` line 3 | `outputFormatCount: 22` | Should be `12` |
| `Marquee.tsx` | Correct (12, 7, 40) | No change needed |
| `WatchWorkWrap.tsx` | Correct (12, 7) | No change needed |

The Marquee and WatchWorkWrap sections are correct, which makes the StatsBar and TwelveFormats discrepancies more visible. A user scrolling the landing page will see "12 Output Formats" in one section and "10 Output Formats" in another.

**The `constants.ts` value of 22 is never consumed by the landing page, but any component that imports `MARKETING_NUMBERS.outputFormatCount` will get the wrong number.**

### Betterish/Impact Score Threshold

The brand system says "Betterish Score" with an 800+ threshold. The codebase has:

- `constants.ts`: `betterishThreshold: 75` and `impactThreshold: 75`
- A comment says "v7 renamed Betterish to Impact Score"
- `Workbench.tsx` line 57: `.lt("score", 900)` (filtering by 900, not 800)

This needs a decision from Mark: is the scoring system 0-100 (with 75 as threshold) or 0-1000 (with 800 as threshold)? The naming and the numbers are out of sync. If the scale is 0-100, update the brand docs. If 0-1000, update the code.

---

## 2. Security Issues (Fix Before Any Real Users)

### Critical: Hardcoded Access Code

**`api/validate-access-code.js` line 19 and `src/components/ProtectedRoute.tsx` line 69:**

The universal fallback access code "oneidea" is hardcoded in both the API and the frontend. If Supabase fails, anyone with this code gets in. For an alpha this is probably fine, but for anything beyond that, this needs to be removed or moved to an env var that isn't committed to the repo.

### High: Missing Auth on Sensitive Endpoints

Several API endpoints accept a `userId` from the request body without verifying the caller owns that ID:

- `run-sentinel.js`: No auth check. Any user can request briefings for any other user.
- `sentinel-cron.js`: CRON_SECRET comparison is vulnerable to timing attacks (string comparison instead of constant-time).
- `admin-data.js`: Token verification exists but the `is_admin` check is a single query with no race condition protection.

### High: File Upload Path Traversal

`upload-resource.js` line 41: User-provided `fileName` is used directly in the storage path (`${userId}/${Date.now()}_${fileName}`). If someone sends `../../etc/passwd` as a filename, bad things could happen. Strip path separators and special characters.

### Medium: No Rate Limiting

No rate limiting on any endpoint. The `/generate`, `/run-pipeline`, and `/adapt-format` endpoints are all expensive (Claude API calls with long timeouts). One motivated person could burn your Anthropic credits in minutes.

### Medium: API Errors Leak Internal Details

Several endpoints return raw Anthropic API error messages to the client (`brand-assets.js`, `brand-dna.js`). Sanitize before returning.

---

## 3. Terminology Violations

### "Orchestrated" vs. "Composed"

The brand rule is clear: **"Composed Intelligence," never "Orchestrated Intelligence."** But "orchestrated/orchestration" appears in user-facing and agent-facing code:

- `src/components/studio/MeetTheTeam.tsx` line 61: Sara's description says "Orchestrates everything."
- `src/lib/agents/prompts/sara-routing.md` line 16: "Sara is the orchestration layer"
- `api/writers-room/bluesky.js` line 5: "Sara (Chief of Staff) is orchestrating"
- Multiple files in `CLEAN_6_5/` docs use "Orchestrated Intelligence" and "orchestration" extensively

The `CLEAN_6_5/systems/START.md` line 150 actually says "Composed Intelligence (not Orchestrated Intelligence)" but the rest of the docs don't follow that rule.

**For the alpha launch:** At minimum, fix `MeetTheTeam.tsx` since that's directly user-facing. The agent prompt files and CLEAN_6_5 docs are internal but should be cleaned up in a follow-up pass.

### "Vibe" Usage

The word "vibe" appears 60+ times in `VisualWrap.tsx` as variable names, type names, state, and UI labels. It's also in `kai.md` and `felix.md` agent prompts. Per your writing rules, this word should not appear. Suggested replacement for the UI: "style" or "aesthetic." For variable names: `selectedStyle`, `STYLE_KEYS`, `StyleKey`.

---

## 4. TypeScript and Build Issues

### TypeScript Error

```
src/pages/studio/Workbench.tsx(63,8): error TS2339:
Property 'finally' does not exist on type 'PromiseLike<void>'.
```

The Supabase client's `.then()` returns a `PromiseLike` (not a full `Promise`), which doesn't have `.finally()`. Fix: chain `.then(() => setLoading(false), () => setLoading(false))` instead, or wrap in `Promise.resolve()`.

### Bundle Size Warning

The main chunk is **695 KB** (186 KB gzipped). Vite flags anything over 500 KB. This is because all studio pages are eagerly imported (the comment in App.tsx explains why: StudioShell context). This is acceptable for alpha but worth addressing later with manual chunk splitting.

---

## 5. Frontend Bugs

### Unhandled Promises (Will Cause Silent Failures)

Multiple components chain `.then()` without `.catch()`:

- `OutputLibrary.tsx`: Supabase queries with no error handling on the promise
- `ProtectedRoute.tsx` line 61: Fire-and-forget `fetch()` for access code redemption (no await, no error handler)
- `BrandDnaSettings.tsx`: Several unhandled async operations

Users will experience these as features that silently don't work, with no error message.

### Window Global Pollution

`WorkSession.tsx` sets `(window as any).__ewWorkStage` and `__ewSetWorkStage` for cross-component communication. This works but creates non-deterministic state that's hard to debug. Should be React Context.

### Missing Loading/Error States

- `Watch.tsx`: Some async operations don't disable buttons during loading
- `OutputLibrary.tsx` line 99: "Rename session" button has no `onClick` handler (dead button)

### Memory Leak Potential

- `Hero.tsx`: `setTimeout` created inside `setInterval` without tracking. If the component unmounts during the animation, the timeout orphans.
- `Index.tsx` SignalField: `useEffect` dependency array is empty `[]` but references `zoomRef`. This works because refs don't trigger re-renders, but it's fragile.

---

## 6. Landing Page and Live Site

The HTML returned from `everywherestudio-one.vercel.app` is clean. The meta tags are solid:

- Title: "EVERYWHERE Studio: Ideas to Impact" (good)
- Description: "Composed Intelligence for Thought Leaders. One idea. Twelve formats. EVERYWHERE it belongs." (correct terminology, correct number)
- OG image: `/favicon.svg` (works but a proper OG image would be stronger for social sharing)
- PWA manifest is registered
- Theme color is set
- Preconnect to Google Fonts is in place

### What I'd Improve on the Landing Page

**The `<html>` background is set to `#F7F9FC` (light gray/white).** But the Index page renders a deep blue canvas, and the Explore page is dark. If the canvas takes a beat to paint, users will see a white flash. The Index component has a CSS fallback gradient, but the HTML default is still light. Change `index.html` line 28 to match the canvas: `html { background-color: #111f88; }`.

**OG Image:** The current OG image is the favicon SVG. For social sharing (LinkedIn, Twitter), you want a 1200x630 raster image. Worth creating before you start sharing the alpha link.

---

## 7. API Code Quality (Non-Blocking but Worth Knowing)

- **Model hardcoding:** `claude-sonnet-4-20250514` is hardcoded in 10+ API files. Should be a single env var for easy updates.
- **Magic numbers everywhere:** Character limits like `3000`, `6000`, `8000`, `12000` are scattered without named constants.
- **Empty catch blocks:** Several endpoints swallow errors silently (`adapt-format.js`, `pipeline-health.js`).
- **Inconsistent status codes:** Some endpoints return 200 for success, others 201. Errors vary between 500, 502, 503.
- **No structured logging:** No timestamps or request IDs in logs. Debugging production issues will be painful.
- **Race condition in `redeem-access-code.js`:** Read-modify-write without a transaction. Two concurrent requests could both pass the limit check.

---

## 8. What's Good (And It's a Lot)

This deserves saying: the bones are strong.

- The signal field canvas animation on the landing page is beautiful. The spring physics on cursor follow feel right. The zoom transition to Explore is smooth.
- The agent pipeline architecture (40 specialists, 7 gates, Sara routing) is well-thought-out and cleanly implemented.
- Lazy loading on marketing/auth pages, eager loading on studio pages is the correct call for perceived performance.
- The Explore page copy ("Your thinking. Everywhere.") is tight and lands the value prop.
- The Marquee component has the right numbers and terminology.
- PWA support is in place with service worker, manifest, and iOS meta tags.
- Error boundaries exist. Theme context exists. Toast notifications exist. The infrastructure is professional.

---

## 9. How I Can Help Further

Here's what I can do right now if you want:

1. **Fix the brand numbers** in StatsBar, TwelveFormats, and constants.ts. I have the files open. Takes 5 minutes.
2. **Fix the TypeScript error** in Workbench.tsx. One-line change.
3. **Replace "Orchestrates everything"** in MeetTheTeam.tsx with "Composes everything" or "Conducts the ensemble."
4. **Fix the HTML background color** in index.html to prevent white flash.
5. **Add `.catch()` handlers** to the unhandled promises in OutputLibrary and ProtectedRoute.
6. **Create an OG image** for social sharing.
7. **Rename "vibe" to "style"** across VisualWrap.tsx (bigger change, ~60 replacements, but mechanical).
8. **Write a pre-launch checklist** for Mark to review the security items before opening access beyond alpha testers.

Say the word on any of these and I'll execute.
