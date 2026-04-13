# EVERYWHERE Studio — System Context for Cursor

Use this document as the single source of truth for what the product is, how it's built, and how Reed + the API fit in.

---

## What this product is

**EVERYWHERE Studio** is an AI-powered content operating system for thought leaders — executive coaches, consultants, and speakers.

**Core loop:** A user talks to an AI named **Reed** about an idea → Reed asks clarifying questions to develop it → the system generates a polished, publication-ready piece of content in one of **12 formats** (LinkedIn Post, Newsletter, Essay, Podcast Script, etc.).

---

## The three rooms (core architecture)

| Room | Role | Purpose |
|------|------|---------|
| **WATCH** | Intelligence layer | Monitors the user's category for trends, threats, and content opportunities. |
| **WORK** | Production layer | 40 AI specialists (simulated via Claude API) transform raw thinking into content, filtered through **Voice DNA** (the user's unique writing style). Reed lives here. |
| **WRAP** | Distribution layer | Packages and schedules content across all channels. |

---

## The AI character: Reed

- **Name:** Reed  
- **Role:** The **First Listener** — asks the right questions; does not generate content immediately.  
- **UI:** Talks to the user through the chat interface in **WorkSession.tsx**.  
- **Flow:** Once Reed has gathered enough context, the **"Make the thing"** button appears and triggers content generation.

---

## Current API architecture (what's wired)

The frontend calls two backend API endpoints. The API key (**ANTHROPIC_API_KEY**) is **server-side only**; never expose it to the frontend.

### 1. POST `/api/chat` — Reed's conversational layer

- **Request:** `{ messages: Array<{ role, content }>, outputType: string }`  
  - `role`: `"user"` or `"reed"` (frontend sends `"assistant"` as `"reed"`).  
- **Response:** `{ reply: string, readyToGenerate: boolean }`  
  - When `readyToGenerate === true`, the frontend enables **"Make the thing"**.  
- **Implemented in:** `server/index.js`; called from **WorkSession.tsx** via `chatWithReed()`.

### 2. POST `/api/generate` — Content generation layer

- **Request:** `{ conversationSummary: string, outputType: string }`  
  - `conversationSummary`: full Reed conversation as a string.  
- **Response:** `{ content: string, score: number }`  
  - `score`: Betterish score (0–1000).  
- **Implemented in:** `server/index.js`; called from **WorkSession.tsx** via `generateOutput()`.

### Base URL

- Set via **VITE_API_BASE** (e.g. `http://localhost:3001` in dev, or your deployed API URL in production).  
- In Vite dev, the proxy forwards `/api/*` to the backend when both are running.

### Health check

- **GET `/api/health`** — Returns `{ ok: true }`. Use to verify the backend is reachable.

---

## User flow (Work section)

1. User opens **/studio/work** and picks an **output type** from the dropdown (12 options).  
2. Reed greets them with an opening question for that format.  
3. User and Reed have a back-and-forth conversation developing the idea.  
4. User clicks **"Make the thing"** → phase shifts to **generating** → Reed orb pulses.  
5. Generated content comes back with a **Betterish score** (0–1000) → phase shifts to **complete**.  
6. User can view the output or start over.

---

## Tech stack

- **Frontend:** React + TypeScript + Vite. Deployed on **Vercel**.  
- **Backend:** Node.js (Express) in **server/index.js**. Proxies to Anthropic Claude API.  
- **For production (1,000+ users):** Backend must be deployed (e.g. Vercel serverless functions, Vercel API routes, or a separate Express host). Set **VITE_API_BASE** to the deployed API URL so the frontend calls the live backend.

---

## Key files

| Area | File |
|------|------|
| Reed UI + chat/generate calls | `src/pages/studio/WorkSession.tsx` |
| /api/chat, /api/generate, /api/health | `server/index.js` |
| API key + local setup | `.env` (ANTHROPIC_API_KEY), **SETUP.md** |
| Explore page (WATCH / WORK / WRAP) | `src/pages/ExplorePage.tsx` |

---

## When changing Reed or the API

- Keep **Reed's voice** as the First Listener: one question at a time, reflect back, use their words.  
- Keep **readyToGenerate** behavior: backend returns `readyToGenerate: true` when it's time to show **"Make the thing"** (e.g. when the system prompt's READY_MARKER is present).  
- Keep **ANTHROPIC_API_KEY** only on the server; never send it to the client.
