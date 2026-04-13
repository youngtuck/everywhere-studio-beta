import { useSyncExternalStore } from "react";

/**
 * WorkSession publishes the active pipeline stage on `window` for the shell top bar
 * and Reed panel. Subscribes via a tiny event so UI stays in sync when the stage changes.
 */
function subscribeWorkStage(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("ew-work-stage", handler);
  return () => window.removeEventListener("ew-work-stage", handler);
}

function getWorkStageSnapshot() {
  return window.__ewWorkStage ?? "Intake";
}

function getServerWorkStageSnapshot() {
  return "Intake";
}

export function useWorkStageFromShell(): string {
  return useSyncExternalStore(subscribeWorkStage, getWorkStageSnapshot, getServerWorkStageSnapshot);
}
