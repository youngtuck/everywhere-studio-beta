/**
 * Sara's routing layer: infer system mode from the user's message.
 * The user never picks a mode; Sara infers it from trigger patterns.
 */

export type SystemMode =
  | "CONTENT_PRODUCTION"
  | "PATH_DETERMINATION"
  | "DECISION_VALIDATION"
  | "STRESS_TEST"
  | "QUICK_REVIEW"
  | "UX_REVIEW"
  | "LEARNING_MODE"
  | "RED_TEAM";

/** Trigger phrases per mode (lowercased). First match wins; order matters. */
const MODE_TRIGGERS: { mode: SystemMode; triggers: string[] }[] = [
  {
    mode: "CONTENT_PRODUCTION",
    triggers: [
      "write me a",
      "create a",
      "draft a",
      "i need a",
      "sunday story:",
      "ss:",
      "make a",
      "turn this into",
      "give me a",
    ],
  },
  {
    mode: "PATH_DETERMINATION",
    triggers: [
      "help me think through",
      "i'm not sure whether to",
      "what should i do about",
      "i'm stuck on",
      "strategy session",
      "i need to figure out",
    ],
  },
  {
    mode: "DECISION_VALIDATION",
    triggers: [
      "i'm leaning toward",
      "stress-test this decision",
      "i've decided to",
      "before i commit",
      "test this decision",
      "run a read-through",
    ],
  },
  {
    mode: "STRESS_TEST",
    triggers: [
      "run the stress test on",
      "battle-test this name",
      "i need to name something",
      "pr faq this",
      "cage match this",
      "stress-test this name",
    ],
  },
  {
    mode: "QUICK_REVIEW",
    triggers: [
      "sbu?",
      "before i send this",
      "is this ready?",
      "ready check",
      "quick review",
    ],
  },
  {
    mode: "UX_REVIEW",
    triggers: [
      "does this work?",
      "ux review",
      "review this page",
      "is this ux good?",
      "check this design",
    ],
  },
  {
    mode: "LEARNING_MODE",
    triggers: [
      "teach me",
      "show me how",
      "walk me through",
      "let me try",
      "i want to learn",
      "how does",
    ],
  },
  {
    mode: "RED_TEAM",
    triggers: [
      "red team this",
      "what am i missing",
      "poke holes in",
      "challenge this",
      "devil's advocate",
      "what's the case against",
    ],
  },
];

