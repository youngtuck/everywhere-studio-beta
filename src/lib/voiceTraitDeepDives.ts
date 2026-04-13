import type { VoiceDNA } from "../utils/voiceDNAProcessor";

export type VoiceTraitKey = keyof VoiceDNA["traits"];

export type VoiceTraitDeepDive = {
  key: VoiceTraitKey;
  label: string;
  /** One line, shown above the bar */
  tagline: string;
  /** Short blurb always visible */
  summary: string;
  /** Long-form guide, personality-test style */
  paragraphs: string[];
};

export const VOICE_TRAIT_DEEP_DIVES: VoiceTraitDeepDive[] = [
  {
    key: "vocabulary_and_syntax",
    label: "Vocabulary and Syntax",
    tagline: "How you pick words and build sentences on purpose.",
    summary:
      "This trait tracks formality, density, jargon, and whether you reach for simple clarity or layered precision. Reed uses it so drafts match how tight or loose you actually write.",
    paragraphs: [
      "High scores here mean your drafts tend to carry recognizable word habits: certain connectors, a default level of formality, and a bias toward either plain speech or specialist language. The system does not judge sophistication. It maps what feels native to you so generated copy does not drift into generic \"LinkedIn polish\" unless that is already your lane.",
      "When this score is lower, you may still write well, but your edge lives elsewhere. Reed leans on your other traits for character and keeps vocabulary in service of those signals instead of forcing ornament.",
      "In sessions, this layer steers word choice in headlines, transitions, and micro copy. It also helps the SLOP gate catch phrases that sound like template language if your real voice is usually more specific.",
    ],
  },
  {
    key: "tonal_register",
    label: "Tonal Register",
    tagline: "The emotional temperature and stance behind your sentences.",
    summary:
      "Warm, cool, direct, diplomatic, urgent, patient: tonal register is how you sound like a person, not a slide deck. Reed matches heat and distance so the reader feels the same relationship to the ideas that they would feel from you.",
    paragraphs: [
      "Think of register as where you stand relative to the reader. Some voices invite. Some challenge. Some stay clinical on purpose. Your score reflects how consistently that stance shows up across answers and samples, not whether one tone is better than another.",
      "A dominant register gives Reed a clear default for intros, apologies, disagreement, and celebration. A mixed register tells Reed you move with context, so it should not freeze you into one mood across every format.",
      "This trait pairs tightly with Voice and Personality layers. If values say you care about craft, register explains whether that care sounds gentle, fierce, or quietly exacting when it hits the page.",
    ],
  },
  {
    key: "rhythm_and_cadence",
    label: "Rhythm and Cadence",
    tagline: "Momentum: how long you let lines run, and where you breathe.",
    summary:
      "Short staccato lines, long controlled builds, and mixed pacing all leave fingerprints. Reed uses this to match sentence length variation, paragraph breaks, and the sense of speed in a piece.",
    paragraphs: [
      "Cadence is one of the fastest ways for readers to sense \"AI\" versus human. Humans cluster short punches with occasional longer explanatory runs. Machines often flatten everything to the same middle length. Your profile here helps the system stay on the human side of that divide when you are a varied writer.",
      "If you are consistently punchy, Reed avoids walls of clause-heavy prose unless the brief truly demands it. If you like long arcs, Reed resists choppy over-summary that would sound like notes instead of finished thought.",
      "Voice DNA does not count syllables for sport. It learns your habits so Impact Score and Human Voice Test have a realistic baseline of what \"sounds like you\" means for pacing.",
    ],
  },
  {
    key: "metaphor_patterns",
    label: "Metaphor Patterns",
    tagline: "Whether you explain through image, analogy, or plain statement.",
    summary:
      "Some thinkers reach for metaphor early. Others ground everything in concrete detail. This trait keeps Reed from adding figurative fluff you would never use, or from staying flat when you usually paint pictures.",
    paragraphs: [
      "Metaphor score is not creativity score. A high number can mean you use one strong image and carry it. A low number can mean you trust direct naming and let ideas stand without literary dressing. Both are professional voices.",
      "When this is strong, Reed can extend a metaphor across a section the way you might in a talk track or essay. When it is light, Reed keeps comparisons sparse and functional so the draft does not feel like someone else's rhetorical style.",
      "This also informs how Reed handles abstract topics like strategy, culture, or risk. It learns whether you translate abstraction through story, through example lists, or through tight definition-first writing.",
    ],
  },
  {
    key: "structural_habits",
    label: "Structural Habits",
    tagline: "How you move the reader from opening to close.",
    summary:
      "Thesis-first, slow reveal, problem then proof, circular return: structure is architecture. Reed uses this to sequence sections, place the sharp claim, and avoid outlines that would feel foreign to how you actually argue.",
    paragraphs: [
      "Some writers lead with the uncomfortable truth. Some build trust before the turn. Your structural habit profile keeps generated outlines and section flows from defaulting to a generic three-act blog shape when you actually prefer memo logic, memo stakes, or narrative deferral.",
      "High structural scores usually mean readers can predict your next move in a good way: you have a signature path through an idea. Reed preserves that path so collaborators feel continuity between your past work and new drafts.",
      "Lower scores here often pair with high flexibility elsewhere. Reed treats that as permission to keep scaffolding lighter and let paragraph logic follow conversation more than blueprint, when the brief allows.",
    ],
  },
];

export function getVoiceTraitDeepDive(key: VoiceTraitKey): VoiceTraitDeepDive | undefined {
  return VOICE_TRAIT_DEEP_DIVES.find(t => t.key === key);
}
