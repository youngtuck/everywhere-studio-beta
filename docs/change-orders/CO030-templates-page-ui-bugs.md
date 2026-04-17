# Change Order CO_030 — Templates Page UI Bugs
**Status:** OPEN
**Opened:** April 14, 2026
**Project:** EVERYWHERE Studio FOH (Vercel)
**Assigned To:** Tucker Howard

---

## Context

Mark logged in to everywherestudio.ai and navigated directly to the Templates page under Wrap. No new session had been initiated. Two UI issues were immediately visible: the top nav was carrying forward a stale session title from a previous visit, and the Template detail panel on the right was clipping content at the bottom of the viewport. Both observed in Chrome on the current production build.

---

## Items

### Item 1 — Stale Session in Top Nav
**Browser:** Chrome
**Reproduction:** Log in. Navigate directly to Templates. Top breadcrumb shows a previous session title even though no new session has been started.
**Expected:** Top nav breadcrumb is empty or neutral on login with no active session.
**Fix:** Clear session context in top nav on login and on "+ New Session" click.

---

### Item 2 — Template Detail Panel Bottom Clipped
**Browser:** Chrome
**Reproduction:** Wrap > Templates. Select any system template. Right detail panel clips at the bottom — Format and Base Output Type cards not fully visible.
**Expected:** Panel is fully scrollable. All content reachable regardless of viewport height.
**Fix:** Set overflow-y: auto on the detail panel. Ensure max-height accounts for top nav and breadcrumb bar height.

---

*(c) 2026 Mixed Grill, LLC*
