import { useSyncExternalStore } from "react";
import {
  getServerWorkSessionContextSnapshot,
  getWorkSessionContextSnapshot,
  subscribeWorkSessionContext,
  type WorkSessionContextSnapshot,
} from "../lib/workSessionContextBridge";

/**
 * CO_031: subscribe to the active Work session context from anywhere in the
 * shell (Reed sidebar, top bar, etc.). Returns a stable snapshot that only
 * changes when meaningful state (stage, progress, readiness) changes.
 */
export function useWorkSessionContext(): WorkSessionContextSnapshot {
  return useSyncExternalStore(
    subscribeWorkSessionContext,
    getWorkSessionContextSnapshot,
    getServerWorkSessionContextSnapshot,
  );
}
