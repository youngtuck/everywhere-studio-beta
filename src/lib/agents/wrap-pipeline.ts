import { runAgent } from "./agent-runner";
import { WRAP_AGENTS } from "./config";
import type { GateResult, PipelineContext } from "./types";

export interface WrapResult {
  finalDraft: string;
  results: GateResult[];
}

export async function runWrapPipeline(
  draft: string,
  context: PipelineContext
): Promise<WrapResult> {
  let currentDraft = draft;
  const results: GateResult[] = [];

  for (const agent of WRAP_AGENTS) {
    const result = await runAgent(
      agent.promptFile,
      `Wrap: ${agent.name} (${agent.label})`,
      currentDraft,
      context,
      "evaluate"
    );

    if (result.revisedDraft) {
      currentDraft = result.revisedDraft;
    }
    results.push(result);
  }

  return { finalDraft: currentDraft, results };
}

