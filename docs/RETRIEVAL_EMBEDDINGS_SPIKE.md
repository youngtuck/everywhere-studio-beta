# Retrieval embeddings spike (design only)

**Status:** spike / plan. No implementation in this document beyond what is needed to scope work.

## Objective

Augment DNA and reference context by **retrieving top K text chunks** whose embeddings are nearest to either:

1. **Session title embedding** (short query: current work name, outline headline, or user-provided title), or  
2. **Draft embedding** (longer query: current editor draft, possibly truncated for embedding input limits).

Chunks are sourced from **Voice DNA**, **Brand DNA**, **Method DNA**, and **reference** materials already stored per user (profiles + `resources` today). Retrieval is **per user_id**; no cross-user vector search.

## In scope (MVP)

| Source (logical) | Origin in DB today | Chunk unit |
|------------------|-------------------|--------------|
| Voice | `profiles.voice_dna_md` + `resources` rows `voice_dna` | Paragraph or ~512 token windows with overlap |
| Brand | `profiles.brand_dna_md` + `resources` rows `brand_dna` | Same |
| Method | `resources` rows `method_dna` only (profiles have no method column) | Same |
| References | `resources` rows `reference` | Same |

**Out of scope for first slice:** `composer_memory` rows (could be phase 2 as a fifth `source_kind`). `outputs.content` history as retrieval corpus (different product decision: vault vs DNA library).

## Schema sketch (Supabase + pgvector)

Enable extension: `CREATE EXTENSION IF NOT EXISTS vector;`  
Dimension must match the embedding model (e.g. 1536 for `text-embedding-3-small`, or 3072 for large; pick one and lock it in migrations).

```sql
-- Logical name: dna_reference_chunks (exact names TBD in migration)

CREATE TABLE public.dna_reference_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind       text NOT NULL CHECK (source_kind IN (
                      'voice_profile', 'voice_resource',
                      'brand_profile', 'brand_resource',
                      'method_resource', 'reference_resource'
                    )),
  source_fingerprint text NOT NULL,  -- hash of upstream blob version (profile updated_at or resource id + updated_at)
  chunk_index       int NOT NULL,
  content           text NOT NULL,   -- plain chunk text only; max ~2k chars recommended
  embedding         vector(1536) NOT NULL,
  token_estimate    int,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_kind, source_fingerprint, chunk_index)
);

CREATE INDEX dna_reference_chunks_user_embedding
  ON public.dna_reference_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);  -- tune per row count

CREATE INDEX dna_reference_chunks_user_kind
  ON public.dna_reference_chunks (user_id, source_kind);
```

**RLS:** `user_id = auth.uid()` for select; insert/update only via service role or a signed Edge Function used by a refresh job.

**Refresh strategy:** on profile or resource row change, recompute fingerprint for that source, delete old chunks for that `(user_id, source_kind, fingerprint prefix)`, insert new chunks + embeddings (batch API). Debounce in application layer to avoid thrash on rapid saves.

## Embedding and chunking rules (plan)

1. Normalize whitespace; strip markdown fence risk for embedding API (plain text is fine).
2. Chunk size target **400 to 800 tokens** with **10 to 15% overlap** so phrases on boundaries are not split blindly.
3. Store **source_kind** and **chunk_index** so prompts can cite “Method chunk 3” internally if needed (optional).
4. **Cap K** per request (e.g. K=6 total, or K=2 per source_kind) to bound prompt size; merge with existing `clipDna` budgets in `api/_dnaContext.js`.

## Retrieval flows

### A) Query = session title (short)

- Embed title string (trim, max ~256 chars if model limits).
- `ORDER BY embedding <=> query_embedding LIMIT K` filtered by `user_id`.
- Boost or filter: optional weight on `method_resource` when `output_type` or session signals methodology-heavy work (future heuristic).

### B) Query = draft (long)

- Embed either **first N characters** (e.g. 8k) or a **summary pass** (cheap model) then embed summary; document tradeoff: summary adds latency, raw head is simpler.
- Same SQL pattern; consider **MMR** (maximal marginal relevance) in app layer to reduce near-duplicate chunks from the same long Voice doc.

### C) Hybrid (later)

- Combine title and draft embeddings (two queries, merge and dedupe by chunk id) or average vectors only if same dimension and product accepts the approximation.

## Integration plan (API)

1. **New module** `api/_retrieveDnaChunks.js` (or Edge Function): `getTopKDnaChunks({ userId, queryText, k, sourceFilter })`.
2. Call sites (later): **`getUserResources`** return path could append a second string `retrievedDnaContext` built from chunks, **or** each of `chat`, `generate`, `adapt-format` calls retrieval when `EW_RETRIEVAL_ENABLED=1` and query text exists (title from body, draft from body). Prefer **one** place to avoid drift; e.g. extend `_resources.js` with optional retrieval when `draftSnippet` and `sessionTitle` passed in a meta object (breaking change risk; alternatively keep retrieval explicit in `generate` only for MVP).
3. **Costs:** one embedding per request for query + amortized refresh on write. Log lengths only (reuse DNA debug pattern).

## MVP checklist (implementation order)

1. Migration: table + extension + RLS.  
2. Offline or on-demand **indexer**: read merged Voice or Brand or Method or reference strings (same merge rules as `getUserResources`), chunk, embed, upsert.  
3. **Query path:** embed title or draft; vector search; clip total chars; inject into system prompt below static DNA blocks or interleaved (product copy decision).  
4. **Feature flag:** `EW_RETRIEVAL_ENABLED=1` and per-user allowlist optional.  
5. **Evaluation:** manual sessions with long Method packs; verify top chunks move with session title change.

## Risks and guardrails

- **Stale embeddings** if refresh job fails; show “last indexed” in Studio optional.  
- **PII in references:** chunks are still user-owned; retrieval does not leave the user row.  
- **Prompt injection:** retrieved text is user data; treat like existing DNA (system boundary, no tool execution).  
- **Latency:** target p95 under ~300ms for single embedding + KNN if index fits; else cap K and lists.

## Open questions

- Single global index per user vs separate indexes per `source_kind` for tuning `lists` in IVFFlat.  
- Whether session title should live only client-side until persisted to `outputs.title` (then embed from DB).  
- Vercel serverless cold start vs Supabase `pgvector` RPC for keeping connection pool simple.

---

**Line count:** this file is intentionally short so it can ship as the spike artifact and be expanded into a ticket breakdown without a full PR description.
