# CO032 — Font Size Slider Breaks Layout Structure

**Status:** OPEN
**Date Opened:** April 14, 2026
**Project:** EVERYWHERE Studio
**Assigned To:** Tucker Howard

---

## Context

Mark was testing the Preferences page in the FOH app and adjusted the font size slider. At the Small setting, the sidebar compressed noticeably and the overall layout appeared broken. At the Large setting, the sidebar expanded beyond its normal width. The layout structure was shifting at every slider position, not just the text.

---

## Item 1: Font Size Slider Rescales Layout Structure

**Title:** Font size slider changes sidebar width and container dimensions

**Environment:** FOH app — Preferences page

**Reproduction Steps:**
1. Open the FOH app
2. Navigate to My Studio > Preferences
3. Move the font size slider to Small
4. Observe the sidebar — it compresses
5. Move the slider to Large
6. Observe the sidebar — it expands
7. Layout proportions shift at every setting

**Expected Behavior:**
The font size slider affects typography only. Sidebar width, nav item height, and container padding hold fixed regardless of font size selection.

**Fix:**
Audit the sidebar and all main layout containers. Every dimension controlling structure (sidebar width, nav item height, container padding) must use `px`. Only typographic properties (`font-size`, `line-height`, text padding) should use `rem` or `em`.

Rule: if it controls layout, use `px`. If it controls text, use `rem`.

---

*(c) 2026 Mixed Grill, LLC*
*EVERYWHERE Studio™ v7.1*
