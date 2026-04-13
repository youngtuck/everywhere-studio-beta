import { describe, it, expect } from "vitest";
import {
  clipDna,
  DNA_LIMITS,
  METHOD_DNA_LEXICON_LINE,
  methodDnaSystemAppendix,
} from "../api/_dnaContext.js";
import {
  GOLDEN_VOICE,
  GOLDEN_BRAND,
  GOLDEN_METHOD,
  GOLDEN_USER_MESSAGE,
} from "./fixtures/dna-golden.js";

describe("clipDna", () => {
  it("returns empty for falsy input", () => {
    expect(clipDna("", 100)).toBe("");
    expect(clipDna(undefined, 100)).toBe("");
  });

  it("returns trimmed full text when under budget", () => {
    expect(clipDna("  hello  ", 10)).toBe("hello");
  });

  it("truncates past budget with fixed marker", () => {
    const long = "x".repeat(200);
    const out = clipDna(long, 40);
    expect(out).toContain("[DNA context truncated for model budget]");
    expect(out.startsWith("x".repeat(40))).toBe(true);
  });
});

describe("methodDnaSystemAppendix", () => {
  it("returns empty when Method DNA is blank", () => {
    expect(methodDnaSystemAppendix("   ", DNA_LIMITS.adapt.method)).toBe("");
  });

  it("includes lexicon line and golden framework id", () => {
    const block = methodDnaSystemAppendix(GOLDEN_METHOD, DNA_LIMITS.adapt.method);
    expect(block).toContain("METHOD DNA (ACTIVE CONSTRAINT):");
    expect(block).toContain(METHOD_DNA_LEXICON_LINE);
    expect(block).toContain("QuantumThinking OS");
    expect(block).toContain("METHOD DNA:\n");
  });
});

/**
 * Mirrors adapt-format.js: methodDna = methodDnaMd || resources.methodDna, then Method before Voice.
 */
function assembleAdaptSystemStub({ methodDnaMd, resourcesMethod, voiceDnaMd, brandDnaMd }) {
  const base = `FORMAT PREAMBLE\n${GOLDEN_USER_MESSAGE}\n`;
  const L = DNA_LIMITS.adapt;
  const methodDna = methodDnaMd || resourcesMethod;
  let system = base;
  if (methodDna?.trim()) {
    system += methodDnaSystemAppendix(methodDna, L.method);
  }
  const voiceDna = voiceDnaMd || "";
  if (voiceDna) {
    system += `\n\nVOICE DNA (ACTIVE CONSTRAINT, write in this voice from the first word):\n${clipDna(voiceDna, L.voice)}`;
  }
  const brandDna = brandDnaMd || "";
  if (brandDna) {
    system += `\n\nBRAND DNA:\n${clipDna(brandDna, L.brand)}`;
  }
  return system;
}

/**
 * Mirrors generate.js primary branch: Method before Voice before Brand.
 */
function assembleGenerateSystemStub(resources) {
  const G = DNA_LIMITS.generate;
  let system = "GENERATION RULES\n";
  if (resources.methodDna?.trim()) {
    system += methodDnaSystemAppendix(resources.methodDna, G.method);
  }
  if (resources.voiceDna) {
    system += `\n\nVOICE DNA (ACTIVE CONSTRAINT):\n${clipDna(resources.voiceDna, G.voice)}`;
  }
  if (resources.brandDna) {
    system += `\n\nBRAND DNA (ACTIVE CONSTRAINT):\n${clipDna(resources.brandDna, G.brand)}`;
  }
  return system;
}

describe("adapt-format style system prompt (golden)", () => {
  it("includes Method when methodDnaMd is provided", () => {
    const system = assembleAdaptSystemStub({
      methodDnaMd: GOLDEN_METHOD,
      resourcesMethod: "",
      voiceDnaMd: GOLDEN_VOICE,
      brandDnaMd: GOLDEN_BRAND,
    });
    expect(system).toContain("QuantumThinking OS");
    expect(system.indexOf("METHOD DNA (ACTIVE CONSTRAINT):")).toBeLessThan(
      system.indexOf("VOICE DNA (ACTIVE CONSTRAINT"),
    );
  });

  it("includes Method from resources when methodDnaMd is empty", () => {
    const system = assembleAdaptSystemStub({
      methodDnaMd: "",
      resourcesMethod: GOLDEN_METHOD,
      voiceDnaMd: GOLDEN_VOICE,
      brandDnaMd: "",
    });
    expect(system).toContain("METHOD DNA (ACTIVE CONSTRAINT):");
    expect(system).toContain("The Bridge");
  });

  it("omits Method block when no method source", () => {
    const system = assembleAdaptSystemStub({
      methodDnaMd: "",
      resourcesMethod: "",
      voiceDnaMd: GOLDEN_VOICE,
      brandDnaMd: GOLDEN_BRAND,
    });
    expect(system).not.toContain("METHOD DNA (ACTIVE CONSTRAINT):");
    expect(system).toContain(GOLDEN_VOICE.slice(0, 20));
  });
});

describe("generate style system prompt (golden)", () => {
  it("includes Method when resources.methodDna is set, before Voice", () => {
    const system = assembleGenerateSystemStub({
      methodDna: GOLDEN_METHOD,
      voiceDna: GOLDEN_VOICE,
      brandDna: GOLDEN_BRAND,
    });
    expect(system).toContain("QuantumThinking OS");
    const m = system.indexOf("METHOD DNA (ACTIVE CONSTRAINT):");
    const v = system.indexOf("VOICE DNA (ACTIVE CONSTRAINT):");
    expect(m).toBeGreaterThan(-1);
    expect(v).toBeGreaterThan(m);
  });

  it("omits Method when resources.methodDna is empty", () => {
    const system = assembleGenerateSystemStub({
      methodDna: "",
      voiceDna: GOLDEN_VOICE,
      brandDna: GOLDEN_BRAND,
    });
    expect(system).not.toContain("METHOD DNA (ACTIVE CONSTRAINT):");
  });
});
