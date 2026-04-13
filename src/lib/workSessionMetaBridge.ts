/**
 * Publishes the active Work session headline for StudioTopBar (thread name).
 * WorkSession is the source of truth; the top bar only displays and requests renames.
 */

import {
  loadSession,
  sessionTitleFromPersisted,
  WORK_SESSION_MIRROR_CHANGED_EVENT,
} from "./sessionPersistence";

export type WorkSessionMetaSnapshot = {
  title: string;
  active: boolean;
};

const serverSnapshot: WorkSessionMetaSnapshot = { title: "", active: false };

let meta: WorkSessionMetaSnapshot = { title: "", active: false };

export function publishWorkSessionMeta(next: WorkSessionMetaSnapshot) {
  meta = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ew-work-session-meta"));
  }
}

export function getWorkSessionMetaSnapshot(): WorkSessionMetaSnapshot {
  return meta;
}

export function subscribeWorkSessionMeta(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => onChange();
  window.addEventListener("ew-work-session-meta", h);
  return () => window.removeEventListener("ew-work-session-meta", h);
}

export function getServerWorkSessionMetaSnapshot(): WorkSessionMetaSnapshot {
  return serverSnapshot;
}

/** Top bar: sessionStorage mirror + in-memory meta for breadcrumb and Return to session. */
export type StudioWorkSessionBarSnapshot = {
  hasLocalMirror: boolean;
  metaActive: boolean;
  hasWorkSessionContext: boolean;
  title: string;
  projectKey: string | null;
};

const serverBarSnapshot: StudioWorkSessionBarSnapshot = {
  hasLocalMirror: false,
  metaActive: false,
  hasWorkSessionContext: false,
  title: "",
  projectKey: null,
};

/** Same reference until fields change, so useSyncExternalStore does not infinite-loop. */
let cachedBarSnapshot: StudioWorkSessionBarSnapshot | null = null;

export function getStudioWorkSessionBarSnapshot(): StudioWorkSessionBarSnapshot {
  const m = getWorkSessionMetaSnapshot();
  const p = typeof window !== "undefined" ? loadSession() : null;
  const hasLocalMirror = p != null;
  const hasWorkSessionContext = hasLocalMirror || m.active;
  const title = ((m.title || "").trim() || (p ? sessionTitleFromPersisted(p) : "") || "New session").slice(0, 200);
  const projectKey = p?.projectKey ?? null;

  if (
    !hasLocalMirror &&
    !m.active &&
    !(m.title || "").trim() &&
    cachedBarSnapshot === null
  ) {
    return serverBarSnapshot;
  }

  if (
    cachedBarSnapshot &&
    cachedBarSnapshot.hasLocalMirror === hasLocalMirror &&
    cachedBarSnapshot.metaActive === m.active &&
    cachedBarSnapshot.hasWorkSessionContext === hasWorkSessionContext &&
    cachedBarSnapshot.title === title &&
    cachedBarSnapshot.projectKey === projectKey
  ) {
    return cachedBarSnapshot;
  }

  const next: StudioWorkSessionBarSnapshot = {
    hasLocalMirror,
    metaActive: m.active,
    hasWorkSessionContext,
    title,
    projectKey,
  };
  cachedBarSnapshot = next;
  return next;
}

export function getServerStudioWorkSessionBarSnapshot(): StudioWorkSessionBarSnapshot {
  return serverBarSnapshot;
}

export function subscribeStudioWorkSessionBar(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => onChange();
  window.addEventListener("ew-work-session-meta", h);
  window.addEventListener(WORK_SESSION_MIRROR_CHANGED_EVENT, h);
  return () => {
    window.removeEventListener("ew-work-session-meta", h);
    window.removeEventListener(WORK_SESSION_MIRROR_CHANGED_EVENT, h);
  };
}

/** Empty string clears the user override and returns to auto naming. */
export function requestSessionRename(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ew-session-rename-request", { detail: { name } }));
}
