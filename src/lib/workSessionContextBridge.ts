/**
 * CO_031: Reed sidebar session state.
 *
 * WorkSession publishes a lightweight snapshot of where the user is in the
 * active session so the Reed sidebar can render stage-appropriate copy and
 * pick a First Move that reflects real progress, not a static default.
 *
 * This is deliberately small. Anything that changes often (draft text,
 * messages array, outline rows) stays local to WorkSession. The sidebar only
 * needs enough to decide what to show and what to offer next.
 */

export type WorkSessionContextSnapshot = {
  /** True while a Work session is open. False on Watch, Wrap, or no session. */
  active: boolean;
  /** Intake | Outline | Edit | Review. Empty string when inactive. */
  stage: string;
  /** Number of Reed questions recorded this intake. Caps at 5 for UI purposes. */
  reedQuestionCount: number;
  /** Channel (format) captured during intake. */
  hasChannel: boolean;
  /** Audience captured during intake. */
  hasAudience: boolean;
  /** User has confirmed intake and is ready for the outline. */
  intakeReady: boolean;
  /** A draft exists for the session. */
  hasDraft: boolean;
  /** The piece has been sent through the Review pipeline at least once. */
  hasReviewed: boolean;
};

const EMPTY: WorkSessionContextSnapshot = {
  active: false,
  stage: "",
  reedQuestionCount: 0,
  hasChannel: false,
  hasAudience: false,
  intakeReady: false,
  hasDraft: false,
  hasReviewed: false,
};

let snapshot: WorkSessionContextSnapshot = EMPTY;

const EVENT = "ew-work-session-context";

function shallowEqual(a: WorkSessionContextSnapshot, b: WorkSessionContextSnapshot): boolean {
  return (
    a.active === b.active &&
    a.stage === b.stage &&
    a.reedQuestionCount === b.reedQuestionCount &&
    a.hasChannel === b.hasChannel &&
    a.hasAudience === b.hasAudience &&
    a.intakeReady === b.intakeReady &&
    a.hasDraft === b.hasDraft &&
    a.hasReviewed === b.hasReviewed
  );
}

export function publishWorkSessionContext(next: WorkSessionContextSnapshot) {
  if (shallowEqual(snapshot, next)) return;
  snapshot = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function clearWorkSessionContext() {
  publishWorkSessionContext(EMPTY);
}

export function getWorkSessionContextSnapshot(): WorkSessionContextSnapshot {
  return snapshot;
}

export function getServerWorkSessionContextSnapshot(): WorkSessionContextSnapshot {
  return EMPTY;
}

export function subscribeWorkSessionContext(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => onChange();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
