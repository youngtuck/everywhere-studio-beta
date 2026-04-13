# CLAUDE.md: Everywhere Studio

This is the CLAUDE.md for the Everywhere Studio codebase. Read this file at the start of every session. It contains project context, brand rules, architectural decisions, and coding standards that govern all work in this repo.

## Project Overview

Everywhere Studio is a Composed Intelligence platform that turns one idea into publication-ready content across 12 formats. It is not a writing tool. It is an intelligence system with 40 specialists, 7 quality gates, and a Voice DNA engine that captures the user's actual voice.

Owner: Mark Sylvester / Mixed Grill LLC / Coastal Intelligence
Designer and Lead Developer: Tucker Dane Howard (contractor, not founder, no equity in Coastal)
Primary content capture agent: Reed (not Watson, always Reed)

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS + shadcn/ui for the studio dashboard
- Inline styles + CSS-in-JS for the marketing/explore page (no Tailwind on marketing pages)
- Supabase (auth, database, storage)
- Anthropic Claude API (claude-sonnet-4-20250514) for all AI features
- Vercel (deployment, serverless functions in /api)
- No animation libraries. All motion is CSS transitions, CSS keyframes, IntersectionObserver, and requestAnimationFrame.

## Architecture

```
src/
  pages/
    Index.tsx          # Landing splash with SignalField canvas, routes to /explore
    ExplorePage.tsx     # Main marketing page (1200+ lines, self-contained)
    AuthPage.tsx        # Login / signup
    OnboardingPage.tsx  # Post-signup onboarding flow
    studio/             # All dashboard pages (protected routes)
  components/
    landing/            # Older landing page components (Nav, Hero, StatsBar, etc.) 
                        # NOTE: These are NOT used by ExplorePage.tsx. ExplorePage is self-contained.
    studio/             # Dashboard shell and studio UI components
    Logo.tsx            # Shared logo component with size and variant props
  context/              # ThemeContext, AuthContext, ToastContext
  lib/
    constants.ts        # MARKETING_NUMBERS, OUTPUT_TYPES, REED_STAGE_CHIPS
    agents/             # Agent configurations and specialist definitions
  hooks/                # useMobile, custom hooks
api/                    # Vercel serverless functions
  chat.js              # Main chat/conversation endpoint
  generate.js          # Content generation pipeline
  run-pipeline.js      # Full pipeline execution
  run-sentinel.js      # Sentinel monitoring system
  voice-dna.js         # Voice DNA analysis
CLEAN_6_5/             # Agent personality files (Reed, Sentinel, etc.)
```

## Canonical Numbers (Fixed, Never Change)

- 40 specialists
- 12 output formats
- 7 quality gates (checkpoints)
- Impact Score threshold: 75+
- These numbers are defined in `src/lib/constants.ts` as MARKETING_NUMBERS

## Terminology (Enforced)

- "Structured Intelligence" is the product category (used in external positioning and marketing)
- "Composed Intelligence" remains the internal architectural term (never "Orchestrated Intelligence", never "Orchestrated")
- "Reed" for the primary content capture agent (never "Watson")
- "Voice DNA" for the voice matching system
- "Impact Score" for the quality score (was previously "Betterish Score")
- "Quality Gates" or "Quality Checkpoints" (interchangeable)
- "Specialists" (not "agents" in external-facing copy)

## Brand System: Marketing Pages

The ExplorePage uses its own design system defined in the CSS block at the top of the file:

### Colors
- Navy: #0C1A29 (primary dark bg)
- Navy Deep: #060D14 (hero and CTA sections)
- Gold: #C8A96E (accent, highlights, gate indicators)
- Blue: #6B7FF2 (secondary accent, logo "EVERYWHERE" color)
- White: #FFFFFF (light section bg)
- Off-white: #F8F9FA (alternate light bg)
- Text: #0A0A0A (dark text on light bg)
- Secondary text: #6B7280
- Tertiary text: #A1A1AA
- On-dark text: #F0EDE4
- Dim-dark text: rgba(255,255,255,0.38)
- Border: #E4E4E7

### Typography
- Display and body: Instrument Sans (loaded via Google Fonts)
- Technical labels, monospace: DM Mono
- No Inter on marketing pages (Inter is only for the studio dashboard / VSCO work)

### Logo
- "EVERYWHERE" in #4A90D9 (Cornflower Blue), weight 700, uppercase
- "Studio" (proper case, not uppercase) in #F5C642 (Signal Gold on dark), #1A1A1A (on light), weight 300
- TM symbol after Studio: 0.32 ratio fontSize, verticalAlign 10px, opacity 0.75
- Component: src/components/Logo.tsx
- Accepts size prop: "sm" (20px), "md" (28px), "lg" (42px), or a number
- Accepts variant prop: "dark" or "light"

### Liquid Glass System
The marketing page has a full liquid glass CSS system already built, adapted from Apple's iOS 26 Figma recipe:
- `.xp-liquid-glass` base class (pseudo-element layers for fills, inner shadows, backdrop blur)
- `.xp-lg-dark` variant (on dark backgrounds)
- `.xp-lg-light` variant (on light/white backgrounds)
- `.xp-lg-shadow` for drop shadows
- `.xp-liquid-glass-border` for angular gradient stroke
- `.xp-glass-card` for card-level glass (lighter treatment)
These classes are defined in the CSS constant inside ExplorePage.tsx.

### Motion
- Primary ease: cubic-bezier(0.16, 1, 0.3, 1) (defined as EASE constant)
- Smooth ease: cubic-bezier(0.4, 0, 0.2, 1) (defined as EASE_SMOOTH constant)
- Scroll reveals use IntersectionObserver via the Reveal wrapper component
- All animations use CSS keyframes defined in the CSS block (prefixed with xp)
- No animation libraries. No GSAP, no Framer Motion, no Lottie.

## Routing

- `/` redirects to `/explore`
- `/explore` is the main marketing page (ExplorePage.tsx, lazy loaded)
- `/auth` is login/signup
- `/studio/*` is the protected dashboard (StudioShell wraps all studio pages)
- The Index page at `/` had a SignalField canvas with a zoom transition to /explore, but routing now redirects directly

## Writing Rules (Apply to ALL text in the codebase)

1. No em-dashes anywhere. Not in code comments, not in marketing copy, not in UI strings. Use commas, periods, colons, semicolons, or restructure the sentence.
2. No emojis in any deployed content.
3. No filler words: "really," "very," "extremely," "incredibly," "it's worth noting," "it's important to."
4. No AI tells: "Great question," "Certainly," "Of course," "I hope this finds you well," "That being said."
5. No passive voice except for deliberate rhetorical effect.
6. Never use the word "vibe." Use atmosphere, energy, tone, character instead.
7. Active voice by default.
8. Concision is respect. Dense, clear copy.

## Code Style

- TypeScript strict mode
- Inline styles for marketing pages (no external CSS files, no Tailwind on marketing)
- Tailwind + shadcn/ui for studio pages
- Functional components with hooks (no class components)
- Named exports for page components, default exports acceptable for components
- No console.log in production code (use console.error for actual errors only)
- Prefer const over let, never use var
- Destructure props in function signatures
- Keep components under 300 lines when possible. ExplorePage is an exception due to its self-contained nature.

## Testing Changes

- `npm run dev` starts the local dev server
- The Explore page is the most complex file. Changes to ExplorePage.tsx should be verified visually at multiple viewport widths.
- Check mobile responsiveness at 900px and 600px breakpoints
- Verify that the nav theme switching works (dark on dark sections, light on light sections) using the data-nav-theme attribute on sections

## Common Pitfalls

- The components in `src/components/landing/` (Nav.tsx, Hero.tsx, StatsBar.tsx, WatchWorkWrap.tsx, QualityCheckpoints.tsx, etc.) are NOT used by ExplorePage.tsx. ExplorePage is fully self-contained with its own implementations of all sections. Do not edit the landing/ components thinking they affect the main marketing page.
- The `navVisible` state in ExplorePage controls nav visibility. If the nav disappears on load, this is likely the cause.
- MARKETING_NUMBERS in constants.ts is the single source of truth for the 40/12/7 numbers. Do not hardcode these values elsewhere.
- The glass CSS classes require elements to have `position: relative` or `isolation: isolate` to layer correctly.
- Backdrop-filter requires the element to have a background (even if mostly transparent) to work in all browsers.

## Design Philosophy

Tension between restraint and presence. 90% disciplined, 10% memorable. Dark-first. Type as architecture. Motion with intent (breathing, not performing). Color as signal, not decoration. Liquid glass should feel like real material, not a CSS trick. Every animation should feel better on the tenth visit, not just the first.
