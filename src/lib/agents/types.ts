export type GateStatus = "PASS" | "FAIL" | "FLAG";
export type PipelineStatus = "IDLE" | "RUNNING" | "PASSED" | "BLOCKED" | "ERROR";
export type ContentState = "lot" | "in_progress" | "vault";

export type OutputType =
  | "essay"
  | "podcast"
  | "book"
  | "website"
  | "video_script"
  | "newsletter"
  | "socials"
  | "presentation"
  | "business"
  | "freestyle";

export interface PipelineContext {
  userId: string;
  outputId: string;
  outputType: OutputType;
  voiceDnaMd: string;
  brandDnaMd?: string;
  methodDnaMd?: string;
  previousOutputTitles?: string[];
  targetPlatform?: string;
}

export interface GateResult {
  gate: string;
  status: GateStatus;
  score: number;
  feedback: string;
  revisedDraft?: string;
  issues?: string[];
  /** Voice Authenticity (Jordan) when Method DNA was present; safe to ignore in UI. */
  methodologyTermFidelity?: string;
  timestamp: string;
}

export interface ImpactScore {
  total: number;
  breakdown: {
    voiceAuthenticity: number;
    researchDepth: number;
    hookStrength: number;
    slopScore: number;
    editorialQuality: number;
    perspective: number;
    engagement: number;
    platformFit: number;
    strategicValue: number;
    nvcCompliance: number;
  };
  verdict: "PUBLISH" | "REVISE" | "REJECT";
  topIssue: string;
  gutCheck: string;
}

export interface PipelineResult {
  status: PipelineStatus;
  finalDraft: string;
  originalDraft: string;
  gateResults: GateResult[];
  impactScore: ImpactScore | null;
  wrapApplied: boolean;
  qaResult: GateResult | null;
  completenessResult: GateResult | null;
  blockedAt?: string;
  totalDurationMs: number;
  runId: string;
}

