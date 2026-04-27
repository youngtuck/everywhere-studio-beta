# IdeasOut Wordmark Spec

Official wordmark system (Mixed Grill, LLC v3.0, April 2026). Use the `Logo` component when implementing the brand lockup anywhere on the site.

## Component

**File:** `src/components/Logo.tsx`

```tsx
import Logo from "@/components/Logo";

// Wordmark only (dark on light backgrounds)
<Logo size="sm" variant="light" />

// Wordmark only (light on dark backgrounds)
<Logo size="md" variant="dark" />

// Full lockup with tagline (dark background)
<Logo size="lg" variant="lockup" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm"` \| `"md"` \| `"lg"` \| `number` | `"md"` | Size scale (sm=20px, md=28px, lg=42px, or custom px). |
| `variant` | `"dark"` \| `"light"` \| `"lockup"` | auto from theme | `dark` = white text, `light` = navy text, `lockup` = white text + tagline below. |
| `onDark` | `boolean` | --- | Legacy prop. Prefer `variant`. |
| `onClick` | `() => void` | --- | Click handler (e.g., navigate to dashboard). |

## Typography

- **Font:** Inter (loaded globally via Google Fonts).
- **"Ideas":** weight 400 (Regular).
- **"Out":** weight 600 (SemiBold).
- **TM superscript:** weight 400 (Regular), ~30% of wordmark height, positioned at top-right of "Out" with breathing room.
- **Letter-spacing:** -0.08em on the wordmark lockup.
- **Tagline (lockup variant only):** "Out of your head and into the world." in Inter ExtraLight (200), -0.04em spacing, 38% of wordmark height.

### Colors

| Variant | Text Color | Use Case |
|---------|-----------|----------|
| light | #0D1B2A (Deep Navy) | On light/white backgrounds |
| dark | #FFFFFF | On dark/navy backgrounds |
| lockup | #FFFFFF | Marketing hero, login screen |

### Sizes

| Size | Wordmark (px) | TM (px) | Tagline (px) |
|------|--------------|---------|--------------|
| sm | 20 | 7 | n/a |
| md | 28 | 8 | n/a |
| lg | 42 | 13 | 16 |

## Where to use

- **Sidebar header:** `<Logo size="sm" variant="dark" />` (navigates to dashboard on click)
- **Marketing nav:** `<Logo size="sm" variant={theme} />`
- **Marketing footer:** `<Logo size="sm" variant="light" />`
- **Login/auth screen:** Tagline rendered separately below Logo as text
- **Marketing hero:** `<Logo size="lg" variant="lockup" />` for full brand lockup

## TM mark

Required on all wordmark renderings (the Logo component includes it automatically) and copyright lines. Not required in body copy mentions of IdeasOut.

## Brand weight contrast

The visual weight shift from "Ideas" (Regular 400) to "Out" (SemiBold 600) is the defining brand characteristic. Do not render both words at the same weight.
