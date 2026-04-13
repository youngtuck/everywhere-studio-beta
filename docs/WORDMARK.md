# EVERYWHERE STUDIO™ — Wordmark Implementation

Official wordmark system (Mixed Grill, LLC · v2.0 · March 8, 2026). Use the **EverywhereWordmark** component and this spec when implementing the brand lockup anywhere on the site.

## Component

**File:** `src/components/EverywhereWordmark.tsx`

```tsx
import EverywhereWordmark from "@/components/EverywhereWordmark";

// Full color (blue + gold) — e.g. on deep navy
<EverywhereWordmark variant="fullColor" size="md" />

// B&W on dark backgrounds
<EverywhereWordmark variant="bwDark" size="sm" />

// B&W on light backgrounds
<EverywhereWordmark variant="bwLight" size="lg" />
```

### Props

| Prop      | Type                                      | Default      | Description |
|-----------|-------------------------------------------|--------------|-------------|
| `variant` | `"fullColor"` \| `"bwDark"` \| `"bwLight"` | `"fullColor"` | Color treatment per background. |
| `size`    | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | `"md"`    | Size scale. |
| `className` | `string`                               | —            | Optional CSS class. |
| `style`   | `React.CSSProperties`                    | —            | Optional inline styles. |

## Spec Summary

- **Font:** Afacad Flux (loaded globally via `index.html`).
- **EVERYWHERE:** weight 700, uppercase.
- **STUDIO™:** weight 300, uppercase; ™ is superscript (smaller size, `vertical-align: top`, `margin-left: 2px`).
- **Letter-spacing:** -1px on the lockup.

### Colors

| Variant     | EVERYWHERE | STUDIO™   | Use case        |
|------------|------------|-----------|------------------|
| fullColor  | #4A90D9    | #F5C642   | On deep navy/dark |
| bwDark     | #FFFFFF    | #FFFFFF   | On dark backgrounds |
| bwLight    | #1A1A1A    | #1A1A1A   | On light backgrounds |

### Sizes (base / ™)

| Size | Base (px) | ™ (px) |
|------|-----------|--------|
| xs   | 14        | 10     |
| sm   | 20        | 14     |
| md   | 32        | 22     |
| lg   | 48        | 34     |
| xl   | 64        | 45     |

## Where to use

- **Nav / header:** `EverywhereWordmark` with `variant="bwDark"` or `variant="bwLight"` depending on theme; size `sm` or `md`.
- **Footer:** Same as nav; often `size="sm"`.
- **Landing hero / full-color sections:** `variant="fullColor"` with `size="lg"` or `xl`.
- **Auth, emails, PDFs:** Use the same variants and sizes for consistency.

Do not alter the lockup (e.g. “Everywhere Studio” in sentence case, or dropping the ™) when implementing the official wordmark. For other treatments, use the existing `Logo` component or typography as designed.
