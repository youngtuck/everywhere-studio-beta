import { supabase } from "./supabase";
import type { StructuredIntake } from "./reedStructuredIntake";

/** sessionStorage mirror key for quick reads (sidebar guard, offline hint). Cloud is source of truth when signed in. */
export const SESSION_KEY = "ew-active-work-session";

export const WORK_SESSION_CLOUD_DEBOUNCE_MS = 2000;
export const WORK_SESSION_RESTORE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Persisted Work stage (matches WorkSession.tsx WorkStage). */
export type PersistedWorkStage = "Intake" | "Outline" | "Edit" | "Review";

export interface PersistedOutlineRow {
  label: string;
  content: string;
  indent?: boolean;
}

export interface PersistedSession {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; ts: number }>;
  input: string;
  outputType: string;
  /** OUTPUT_TYPES id when set (e.g. essay, linkedin_post). */
  outputTypeId?: string | null;
  /** Minutes of spoken talk when outputTypeId is talk (Wrap and draft targets use minutes × 300 words). */
  talkDuration?: number | null;
  /** Edit inspector: user override for draft word target (null = follow type defaults). */
  editDraftWordTarget?: number | null;
  sessionTitle: string;
  /** User-chosen thread name. When null or empty on save, title is derived from outline or intake. */
  sessionNameOverride?: string | null;
  phase: "input" | "generating" | "complete";
  generatedContent: string;
  generatedScore: number;
  generatedOutputId: string;
  generatedGates: unknown;
  isReady: boolean;
  timestamp: number;
  workStage?: PersistedWorkStage;
  outlineRows?: PersistedOutlineRow[];
  selectedFormats?: string[];
  /** Reed-locked Thesis / Audience / Goal / Hook / Format; synced to work_sessions.payload. */
  structuredIntake?: StructuredIntake | null;
  /** Studio project key for Supabase row (matches work_sessions.project_key). */
  projectKey?: string;
}

export type WorkSessionDbRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  project_key: string;
  session_title: string;
  work_stage: string;
  stage: string;
  output_type: string | null;
  messages: unknown;
  outline_rows: unknown;
  draft: string;
  payload: unknown;
  updated_at: string;
  created_at: string;
};

export function getWorkStageFromPersisted(state: PersistedSession): PersistedWorkStage {
  if (state.workStage === "Intake" || state.workStage === "Outline" || state.workStage === "Edit" || state.workStage === "Review") {
    return state.workStage;
  }
  if (state.phase === "complete" || state.phase === "generating") return "Edit";
  return "Intake";
}

/** Dispatched after sessionStorage mirror write or clear so the top bar can re-read `loadSession()`. */
export const WORK_SESSION_MIRROR_CHANGED_EVENT = "ew-session-mirror-changed";

/** True when the mirrored session has enough state to treat as an in-flight work thread (matches Dashboard pickup). */
export function persistedSessionHasPickup(p: PersistedSession): boolean {
  const msgs = p.messages?.length ?? 0;
  if (msgs > 1) return true;
  if ((p.generatedContent || "").trim().length > 40) return true;
  if (p.outlineRows && p.outlineRows.length > 0) return true;
  return false;
}

export function sessionTitleFromPersisted(p: PersistedSession): string {
  const override = (p.sessionNameOverride || "").trim();
  if (override) return override.slice(0, 200);
  const st = (p.sessionTitle || "").trim();
  if (st) return st.slice(0, 200);
  const outline = p.outlineRows?.[0]?.content?.trim();
  if (outline) return outline.slice(0, 200);
  const userMsg = p.messages?.find(m => m.role === "user")?.content?.trim();
  if (userMsg) return userMsg.slice(0, 200);
  return "New session";
}

export function sessionTitleFromWorkSessionRow(row: WorkSessionDbRow): string {
  const st = (row.session_title || "").trim();
  if (st) return st.slice(0, 200);
  const p = row.payload as PersistedSession | null;
  const messages = (Array.isArray(row.messages) && row.messages.length > 0
    ? row.messages
    : p?.messages) as Array<{ role?: string; content?: string }> | undefined;
  const userLine = messages?.find(m => m.role === "user")?.content?.trim();
  if (userLine) return userLine.slice(0, 200);
  return "Untitled session";
}

export function workProjectKeyFromShellId(activeProjectId: string | null | undefined): string {
  if (!activeProjectId || activeProjectId === "default") return "default";
  return activeProjectId;
}

export function studioProjectUuidForRow(activeProjectId: string | null | undefined): string | null {
  if (!activeProjectId || activeProjectId === "default") return null;
  return activeProjectId;
}

export function workSessionRowHasMeaningfulWork(row: WorkSessionDbRow): boolean {
  const msgs = Array.isArray(row.messages) ? row.messages.length : 0;
  if (msgs > 1) return true;
  if ((row.draft || "").trim().length > 40) return true;
  const orows = row.outline_rows;
  if (Array.isArray(orows) && orows.length > 0) return true;
  const p = row.payload as Partial<PersistedSession> | null;
  if (p?.messages && Array.isArray(p.messages) && p.messages.length > 1) return true;
  if (p?.generatedContent && String(p.generatedContent).trim().length > 40) return true;
  if (p?.outlineRows && Array.isArray(p.outlineRows) && p.outlineRows.length > 0) return true;
  return false;
}

/** Offer cloud restore when the row is recent, has content, and is newer than the local mirror (if any). */
export function shouldOfferWorkSessionRestore(row: WorkSessionDbRow, localMirror: PersistedSession | null): boolean {
  const updated = new Date(row.updated_at).getTime();
  if (Number.isNaN(updated)) return false;
  if (Date.now() - updated > WORK_SESSION_RESTORE_MAX_AGE_MS) return false;
  if (!workSessionRowHasMeaningfulWork(row)) return false;
  const localTs = localMirror?.timestamp ?? 0;
  if (localTs >= updated) return false;
  return true;
}

export function rowToPersistedSession(row: WorkSessionDbRow): PersistedSession {
  const fromPayload = row.payload as PersistedSession | null;
  if (fromPayload && typeof fromPayload === "object" && Array.isArray(fromPayload.messages)) {
    return {
      ...fromPayload,
      timestamp: new Date(row.updated_at).getTime(),
      projectKey: row.project_key,
    };
  }
  const messages = (Array.isArray(row.messages) ? row.messages : []) as PersistedSession["messages"];
  const outlineRows = (Array.isArray(row.outline_rows) ? row.outline_rows : []) as PersistedOutlineRow[];
  const stage = (row.stage || row.work_stage || "Intake") as PersistedWorkStage;
  return {
    messages: messages.length
      ? messages
      : [{ id: "0", role: "assistant", content: "Good to see you. What are you working on?", ts: Date.now() }],
    input: "",
    outputType: row.output_type ?? "freestyle",
    outputTypeId: row.output_type ?? null,
    talkDuration: null,
    sessionTitle: row.session_title || "",
    sessionNameOverride: null,
    phase: (row.draft || "").trim() ? "complete" : "input",
    generatedContent: row.draft || "",
    generatedScore: 0,
    generatedOutputId: "",
    generatedGates: null,
    isReady: false,
    timestamp: new Date(row.updated_at).getTime(),
    workStage: stage,
    outlineRows,
    selectedFormats: undefined,
    structuredIntake: null,
    projectKey: row.project_key,
  };
}

async function upsertWorkSessionRow(userId: string, projectKey: string, projectId: string | null, state: PersistedSession) {
  const workStage = getWorkStageFromPersisted(state);
  const title = (state.sessionTitle || "").trim() || "Untitled";
  const messagesJson = state.messages.map(m => ({ id: m.id, role: m.role, content: m.content, ts: m.ts }));
  const outlineJson = (state.outlineRows || []).map(r => ({ label: r.label, content: r.content, indent: r.indent }));
  const draftText = state.generatedContent || "";
  const outputTypeCol = state.outputTypeId ?? state.outputType ?? null;
  const payload = { ...state, projectKey } as unknown as Record<string, unknown>;

  try {
    const { error } = await supabase.from("work_sessions").upsert(
      {
        user_id: userId,
        project_key: projectKey,
        project_id: projectId,
        session_title: title.slice(0, 200),
        work_stage: workStage,
        stage: workStage,
        output_type: outputTypeCol,
        messages: messagesJson,
        outline_rows: outlineJson,
        draft: draftText,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_key" },
    );
    if (error) console.error("[work_sessions] upsert", error.message);
  } catch (e) {
    console.error("[work_sessions] upsert", e);
  }
}

export async function flushWorkSessionToSupabase(
  userId: string,
  projectKey: string,
  projectId: string | null,
  state: PersistedSession,
) {
  await upsertWorkSessionRow(userId, projectKey, projectId, state);
}

export async function fetchWorkSessionRow(userId: string, projectKey: string): Promise<WorkSessionDbRow | null> {
  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("project_key", projectKey)
    .maybeSingle();
  if (error) {
    console.error("[work_sessions] fetch", error.message);
    return null;
  }
  return data as WorkSessionDbRow | null;
}

export async function deleteRemoteWorkSession(userId: string, projectKey: string) {
  try {
    const { error } = await supabase
      .from("work_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("project_key", projectKey);
    if (error) console.error("[work_sessions] delete", error.message);
  } catch (e) {
    console.error("[work_sessions] delete", e);
  }
}

export function saveSessionLocalMirror(state: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(WORK_SESSION_MIRROR_CHANGED_EVENT));
    }
  } catch {
    /* ignore quota */
  }
}

/** Mirror only. Signed-in cloud sync uses debounced `flushWorkSessionToSupabase` from WorkSession. */
export function saveSession(state: PersistedSession, _opts?: { userId?: string | null }) {
  saveSessionLocalMirror(state);
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORK_SESSION_MIRROR_CHANGED_EVENT));
  }
}

export const WORK_SESSION_OUTPUT_TYPE_ID_EVENT = "ew-work-session-output-type-id";

export function hasPersistedWorkSession(): boolean {
  return loadSession() != null;
}

export function patchPersistedSessionOutputTypeId(
  outputTypeId: string,
  opts?: { userId?: string | null },
): boolean {
  const p = loadSession();
  if (!p) return false;
  const projectKey = p.projectKey ?? "default";
  const next: PersistedSession = {
    ...p,
    outputTypeId,
    outputType: outputTypeId,
    timestamp: Date.now(),
    projectKey,
  };
  saveSessionLocalMirror(next);
  const uid = opts?.userId;
  if (uid) {
    void supabase
      .from("work_sessions")
      .update({
        output_type: outputTypeId,
        payload: next as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .eq("project_key", projectKey);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(WORK_SESSION_OUTPUT_TYPE_ID_EVENT, { detail: { outputTypeId } }),
    );
  }
  return true;
}
