/**
 * DNA-only observability. Set EW_DEBUG_DNA=1 to enable.
 * Logs JSON lines: lengths and booleans only (no raw DNA text, no user ids).
 */

function enabled() {
  const v = process.env.EW_DEBUG_DNA;
  return v === "1" || v === "true";
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} fields safe scalars only
 */
export function dnaDebug(event, fields = {}) {
  if (!enabled()) return;
  const line = {
    ts: new Date().toISOString(),
    scope: "dna",
    event,
    ...fields,
  };
  console.log(JSON.stringify(line));
}

/**
 * @param {string} caller logical source (e.g. api route name)
 * @param {{ voiceDna?: string, brandDna?: string, methodDna?: string, references?: string, composerMemory?: string }} bundle merged resources
 * @param {Record<string, unknown>} [extras] counts, booleans, reasons
 */
export function dnaDebugResourcesLoaded(caller, bundle, extras = {}) {
  if (!enabled()) return;
  const voiceLen = (bundle?.voiceDna || "").length;
  const brandLen = (bundle?.brandDna || "").length;
  const methodLen = (bundle?.methodDna || "").length;
  const referencesLen = (bundle?.references || "").length;
  const composerMemoryLen = (bundle?.composerMemory || "").length;
  dnaDebug("resources.loaded", {
    caller,
    voiceLen,
    brandLen,
    methodLen,
    referencesLen,
    composerMemoryLen,
    hasVoice: voiceLen > 0,
    hasBrand: brandLen > 0,
    hasMethod: methodLen > 0,
    hasReferences: referencesLen > 0,
    hasComposerMemory: composerMemoryLen > 0,
    ...extras,
  });
}
