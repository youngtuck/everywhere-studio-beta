import { runAgent } from "./agent-runner";
import { GATE_DEFINITIONS } from "./config";
import type { GateResult, PipelineContext } from "./types";

export interface GatePipelineResult {
  status: "PASSED" | "BLOCKED";
  currentDraft: string;
  results: GateResult[];
  blockedAt?: string;
}

export async function runGatePipeline(
  draft: string,
  context: PipelineContext,
  onGateComplete?: (result: GateResult, gateIndex: number) => void
): Promise<GatePipelineResult> {
  let currentDraft = draft;
  const results: GateResult[] = [];

  for (let i = 0; i < GATE_DEFINITIONS.length; i++) {
    const gate = GATE_DEFINITIONS[i];

    const result = await runAgent(
      gate.promptFile,
      `Checkpoint ${gate.id.split("-")[1]}: ${gate.name} (${gate.label})`,
      currentDraft,
      context,
      "evaluate"
    );

    if (result.status === "FAIL" && gate.blocking) {
      const fixResult = await runAgent(
        gate.promptFile,
        `${gate.name} (fix)`,
        currentDraft,
        context,
        "fix",
        result.feedback
      );

      if (fixResult.revisedDraft) {
        currentDraft = fixResult.revisedDraft;
      }

      const recheck = await runAgent(
        gate.promptFile,
        `Checkpoint ${gate.id.split("-")[1]}: ${gate.name} (recheck)`,
        currentDraft,
        context,
        "evaluate"
      );

      if (recheck.status === "FAIL") {
        results.push(recheck);
        onGateComplete?.(recheck, i);
        return {
          status: "BLOCKED",
          currentDraft,
          results,
          blockedAt: `Checkpoint ${gate.id.split("-")[1]}: ${gate.name}`,
        };
      }

      if (recheck.revisedDraft) {
        currentDraft = recheck.revisedDraft;
      }
      results.push(recheck);
      onGateComplete?.(recheck, i);
    } else {
      if (result.revisedDraft) {
        currentDraft = result.revisedDraft;
      }
      results.push(result);
      onGateComplete?.(result, i);
    }
  }

  return {
    status: "PASSED",
    currentDraft,
    results,
  };
}

