/**
 * Wrap channel adaptation constraints keyed by Work output type (from Review Pre-Wrap picker).
 * Injected into /api/adapt-format as an extra system block per channel.
 */

export const DEFAULT_PRESENTATION_MINUTES = 15;
export const WORDS_PER_PRESENTATION_MINUTE = 300;

export function presentationTargetWords(minutes: number | null | undefined): number {
  const m = typeof minutes === "number" && minutes > 0 && Number.isFinite(minutes)
    ? Math.min(180, Math.max(3, Math.round(minutes)))
    : DEFAULT_PRESENTATION_MINUTES;
  return m * WORDS_PER_PRESENTATION_MINUTE;
}

/** Same pacing rule as presentation: 300 words per minute of spoken time. */
export function talkTargetWords(minutes: number | null | undefined): number {
  return presentationTargetWords(minutes);
}

const OUTPUT_LABELS: Record<string, string> = {
  essay: "Essay",
  talk: "Talk",
  social_media: "Social / LinkedIn-style",
  newsletter: "Newsletter",
  podcast: "Podcast",
  presentation: "Talk / Presentation",
  email: "Email",
  video_script: "Video script",
  case_study: "Case Study",
  one_pager: "One-Pager",
  book: "Book Chapter",
  freestyle: "Freestyle",
};

export function outputTypeDisplayLabel(id: string): string {
  return OUTPUT_LABELS[id] || id.replace(/_/g, " ");
}

/**
 * Short bullets for Wrap UI (no em-dashes).
 */
export function getWrapRuleSummaryLines(
  outputTypeId: string,
  presentationMinutes: number | null | undefined,
  talkDurationMinutes?: number | null | undefined,
): string[] {
  const pm = typeof presentationMinutes === "number" && presentationMinutes > 0
    ? Math.round(presentationMinutes)
    : DEFAULT_PRESENTATION_MINUTES;
  const pw = presentationTargetWords(presentationMinutes);
  const tm = typeof talkDurationMinutes === "number" && talkDurationMinutes > 0
    ? Math.round(talkDurationMinutes)
    : DEFAULT_PRESENTATION_MINUTES;
  const tw = talkTargetWords(talkDurationMinutes);

  switch (outputTypeId) {
    case "social_media":
      return [
        "LinkedIn-style post cap: about 400 words, no subheads.",
        "Threads: numbered chunks, each under 280 characters.",
      ];
    case "essay":
      return [
        "Long essay: use ## subchapters where the channel allows markdown.",
        "LinkedIn tab: target about 1200 words, no subheads.",
      ];
    case "newsletter":
      return [
        "Newsletter: subheads, table of contents, SEO metadata (subject, preview, SEO title).",
      ];
    case "podcast":
      return [
        "Podcast: cue markers and directorial notes throughout the script.",
      ];
    case "presentation":
      return [
        `Talk / Presentation: target length about ${pw} words (${pm} min × ${WORDS_PER_PRESENTATION_MINUTE} words/min).`,
      ];
    case "talk":
      return [
        `Talk: target length about ${tw} words (${tm} min × ${WORDS_PER_PRESENTATION_MINUTE} words/min).`,
        "Spoken script: short paragraphs, no ## subheads, inline [pause] and [beat] only, no footnotes, no academic structure.",
      ];
    case "email":
      return [
        "Email: about 300 words max in the body, one primary CTA.",
      ];
    case "video_script":
      return [
        "Video script: shot or beat markers and clear speaker or VO lanes where useful.",
      ];
    case "case_study":
      return [
        "Case Study: structured sections (context, challenge, approach, outcome, metrics).",
      ];
    case "one_pager":
      return [
        "One-Pager: tight sections, about 400 words total for the one-pager body.",
      ];
    case "book":
      return [
        "Book chapter: 3000+ words when the channel supports long form, clear chapter arc, ## subchapters.",
      ];
    case "proposal":
    case "report":
    case "white_paper":
    case "executive_summary":
    case "sow":
    case "meeting":
    case "session_brief":
      return [
        "Business document: tight sections, decision-ready tone, explicit headings where markdown allows.",
      ];
    case "bio":
      return [
        "Bio / profile: first-person or third-person consistency, credential-led structure.",
      ];
    case "website":
      return [
        "Web copy: scannable blocks, H2 sections, one primary action per page slice.",
      ];
    default:
      return [
        "Standard adaptation: follow channel rules and Voice DNA.",
      ];
  }
}

/** Legacy Work session ids map to catalog / constraint ids. */
function normalizeWorkSourceTypeId(id: string): string {
  if (id === "socials") return "social_media";
  return id;
}

/** Model-facing supplement for one channel tab (FORMAT_INSTRUCTIONS key). */
export function buildWrapConstraintSupplement(
  outputTypeId: string,
  channelFormat: string,
  presentationMinutes: number | null | undefined,
  talkDurationMinutes?: number | null | undefined,
): string {
  const pm = typeof presentationMinutes === "number" && presentationMinutes > 0
    ? Math.min(180, Math.max(3, Math.round(presentationMinutes)))
    : DEFAULT_PRESENTATION_MINUTES;
  const presWords = pm * WORDS_PER_PRESENTATION_MINUTE;
  const tdm = typeof talkDurationMinutes === "number" && talkDurationMinutes > 0
    ? Math.min(180, Math.max(3, Math.round(talkDurationMinutes)))
    : DEFAULT_PRESENTATION_MINUTES;
  const talkWords = tdm * WORDS_PER_PRESENTATION_MINUTE;
  const lines: string[] = [];
  const ot = normalizeWorkSourceTypeId(outputTypeId);

  lines.push(`DESTINATION CHANNEL: ${channelFormat}. SOURCE OUTPUT TYPE (from Work): ${outputTypeId}.`);
  lines.push("This channel must read as native to its medium. Same topic and intellectual substance as the draft, but not the same sentences, paragraph order, or rhetorical shape as the source or as any other channel would use.");

  if (ot === "social_media") {
    if (channelFormat === "LinkedIn") {
      lines.push("LinkedIn post profile: keep the adapted post at or under about 400 words. No markdown subheads (no ## lines). Short paragraphs. Single strong hook line up front.");
    } else if (channelFormat === "X Thread") {
      lines.push("Thread profile: number each post (1/, 2/, …). Each segment must stay under 280 characters. Split ideas rather than truncating.");
    } else {
      lines.push("Keep this adaptation concise and scannable, social-first tone.");
    }
  }

  if (ot === "essay") {
    if (channelFormat === "LinkedIn") {
      lines.push("LinkedIn essay profile: target roughly 900 to 1300 words of adapted content. No ## subheads. Preserve argument flow without listicle structure.");
    } else if (channelFormat === "Newsletter" || channelFormat === "Sunday Story" || channelFormat === "Email" || channelFormat === "Executive Brief") {
      lines.push("Essay profile: use ## subchapters for major sections where markdown is allowed. Maintain a clear arc through those sections.");
    } else if (channelFormat === "Podcast") {
      lines.push("Essay profile: keep a clear thesis through OPEN, HOOK, BODY, CLOSE. BODY may use internal ## labels only if they help the host; spoken text stays natural.");
    } else {
      lines.push("Essay profile: prefer hierarchical structure with ## headings when the channel accepts markdown.");
    }
  }

  if (ot === "newsletter") {
    if (channelFormat === "Newsletter") {
      lines.push("Newsletter source profile: include a short TABLE OF CONTENTS listing ## sections after the opening. Use ## subheads throughout the body. Fill SUBJECT, PREVIEW, and SEO_TITLE fields as specified in the newsletter template.");
      lines.push("Place a literal line starting with TABLE OF CONTENTS: followed by numbered section titles matching each ## heading.");
    } else {
      lines.push("Newsletter source profile: when the channel allows, mirror newsletter discipline (clear sections, optional TOC, metadata-style openers).");
    }
  }

  if (ot === "podcast" && channelFormat === "Podcast") {
    lines.push("Podcast source profile: add bracketed cue and direction lines throughout (for example [CUE: softer tone], [DIRECTOR: pause for beat], [B-ROLL: city skyline]) in addition to any [PAUSE] or [SEGMENT BREAK] markers.");
  }

  if (ot === "presentation") {
    lines.push(`Talk / presentation profile: treat spoken or slide-support length as about ${presWords} words total for this session (${pm} minutes at ${WORDS_PER_PRESENTATION_MINUTE} words per minute), unless the channel template forces a shorter cap. State timing assumptions in SHOW_NOTES or intro where relevant.`);
    if (channelFormat === "Executive Brief") {
      lines.push("Map slide beats to brief sections where helpful.");
    }
  }

  if (ot === "talk") {
    lines.push(`Talk profile (spoken keynote or script, not an essay): target about ${talkWords} words for this session (${tdm} minutes at ${WORDS_PER_PRESENTATION_MINUTE} words per minute), unless the channel template forces a shorter cap.`);
    lines.push("Structure: short paragraphs only. No markdown ## subheads, no numbered academic sections, no footnotes or citations block. Use natural spoken transitions. Mark rhythm with inline [pause] or [beat] only (lowercase inside brackets as shown). No table of contents.");
    lines.push("Tone: one voice addressing an audience out loud. If the channel is long-form markdown, still avoid essay subheads; use blank-line breaks between beats instead.");
  }

  if (ot === "email" && (channelFormat === "Email" || channelFormat === "Newsletter")) {
    lines.push("Email source profile: cap the main body near 300 words when possible. Exactly one primary call to action. No secondary competing CTAs.");
  }

  if (ot === "video_script" && (channelFormat === "YouTube Description" || channelFormat === "Podcast")) {
    lines.push("Video script profile: include production-friendly markers (scene, shot, beat, VO) alongside spoken lines where appropriate.");
  }

  if (ot === "case_study") {
    lines.push("Case study profile: use labeled sections (Context, Challenge, Approach, Outcome, Metrics, Learnings) when structure fits the channel.");
  }

  if (ot === "one_pager") {
    lines.push("One-pager profile: strict modular sections, total adapted core under about 400 words when the channel is brief-style (Executive Brief, Email). No fluff.");
  }

  if (ot === "book" && (channelFormat === "Sunday Story" || channelFormat === "Newsletter" || channelFormat === "Executive Brief")) {
    lines.push("Book chapter profile: aim for long-form depth (3000+ words) only when the channel format allows; otherwise compress but keep chapter arc (setup, turn, landing). Use ## subchapters for long markdown outputs.");
  }

  if (["proposal", "report", "white_paper", "executive_summary", "sow", "meeting", "session_brief", "bio", "website"].includes(ot)) {
    lines.push(`Business source profile (${ot}): use labeled sections, decision-first ordering, and minimal prose padding.`);
  }

  if (ot === "freestyle") {
    lines.push("Freestyle: no extra source-type constraints beyond channel defaults.");
  }

  const channelVoice: Partial<Record<string, string>> = {
    LinkedIn:
      "LinkedIn-only: write for the feed. Strong first line before the fold, airy paragraphs, no markdown headings, no long essay throat clearing.",
    Newsletter:
      "Newsletter-only: structured editorial with SUBJECT/PREVIEW/SEO blocks when the template requires them, then ## sections. Not a Sunday memoir and not a LinkedIn post pasted long-form.",
    Podcast:
      "Podcast-only: spoken script with markers. Short clauses, contractions, host cadence. Never keep written-article pacing or paragraph shapes from the source.",
    "Sunday Story":
      "Sunday Story-only: narrative personal essay. Scene-led opening, no email metadata blocks, no numbered tweet mechanics, no decision-memo headings.",
    Email:
      "Email-only: one send, one CTA, mobile-first brevity. Not a Substack-length issue and not a thread.",
    "X Thread":
      "Thread-only: numbered micro-posts under 280 characters each. No long paragraphs; split beats across tweets.",
    "Executive Brief":
      "Executive Brief-only: decision document with labeled sections (Decision Required, Context, Recommendation, Risks, Next Step). No storytelling cold open unless one tight sentence sets stakes.",
    "YouTube Description":
      "YouTube packaging-only: title plus discovery-first description and optional timestamps. Not a blog article in prose blocks.",
  };
  const tail = channelVoice[channelFormat];
  if (tail) lines.push(tail);

  return lines.join("\n");
}

