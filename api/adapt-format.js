import Anthropic from "@anthropic-ai/sdk";
import { getUserResources } from "./_resources.js";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import fs from "fs";
import path from "path";
import { requireAuth } from "./_auth.js";
import { dnaDebug } from "./_dnaDebugLog.js";
import { clipDna, DNA_LIMITS, methodDnaSystemAppendix } from "./_dnaContext.js";
import { formatStructuredIntakeForPrompt } from "./_structuredIntakePrompt.js";
import { setCorsHeaders } from "./_cors.js";

function loadPrompt(filename) {
  const paths = [
    path.join(process.cwd(), "src", "lib", "agents", "prompts", filename),
    path.join("/var/task", "src", "lib", "agents", "prompts", filename),
  ];
  if (typeof __dirname !== "undefined") {
    paths.push(path.join(__dirname, "..", "src", "lib", "agents", "prompts", filename));
  }
  for (const p of paths) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      if (content) return content;
    } catch {}
  }
  return null;
}

const FORMAT_INSTRUCTIONS = {
  LinkedIn: {
    platformSpec: "LinkedIn",
    system: `You are adapting content for LinkedIn. You are Dmitri Wells, platform optimization specialist.

LINKEDIN RULES (non-negotiable):
- Maximum 3,000 characters total
- First line is CRITICAL: must function as a complete hook before the "see more" break at ~210 characters. This first line alone determines whether anyone reads further. It must create enough tension or curiosity that a busy executive stops scrolling.
- Short paragraphs: 2-4 lines maximum. LinkedIn rewards white space. Walls of text are algorithmically penalized and abandoned by readers.
- NO markdown formatting. LinkedIn does not render markdown. Asterisks and pound signs appear as literal characters. Strip all markdown.
- NO links in the post body (they suppress organic reach). If the draft references URLs, note them in a comment suggestion at the end.
- Single line break between short paragraphs. Double line break for major section transitions.
- End with a question that invites genuine response, not a generic CTA.
- 3-5 relevant hashtags at the very end, separated from the body by a double line break.
- The voice must match the Voice DNA exactly. LinkedIn is personal-professional, not corporate.
- Do NOT add "What do you think?" or other generic engagement bait. Write a specific, interesting question that comes from the content.

LENGTH TARGET: Roughly 280 to 520 words of body copy unless the idea truly needs more, but stay under the 3,000 character hard cap.

OUTPUT FORMAT: Return ONLY the adapted LinkedIn post. No commentary. No "Here's your LinkedIn post:" header. Just the post, ready to paste into LinkedIn.`,
  },

  Newsletter: {
    platformSpec: "Substack",
    system: `You are adapting content for a Substack newsletter. You are Dmitri Wells, platform optimization specialist.

NEWSLETTER RULES (non-negotiable):
- This is NOT a Sunday Story and NOT a LinkedIn post. It is a structured newsletter: metadata first, then scannable sections with ## headings and a quotable pull.
- Open with a direct address to the reader. Newsletter subscribers expect personal connection. One sentence that makes them feel like this was written for them specifically.
- SEO title: keyword-rich, clear about the specific topic, structured for discovery. This goes in the subject line field.
- Email subject line: optimized for open rate. Curiosity gap, specificity, or personal relevance. Keep under 50 characters for mobile display.
- Preview text: 80-140 characters that complete the subject line's thought, not repeat it.
- Longer paragraphs are acceptable here (unlike LinkedIn), but every paragraph must earn its length.
- Include one "quotable passage" that works out of context for restacking/sharing.
- Use subheadings (## in markdown) to create scannable structure.
- End with a single clear CTA, not multiple competing ones.
- The voice must match the Voice DNA. Newsletters reward personality and point of view more than any other format.

OUTPUT FORMAT: Return the adapted newsletter in this exact structure:
SUBJECT: [email subject line, under 50 chars]
PREVIEW: [preview text, 80-140 chars]
SEO_TITLE: [SEO-optimized title]
---
[newsletter body in markdown]`,
  },

  Podcast: {
    platformSpec: "Podcast Platforms",
    system: `You are adapting content into a podcast script. You are Dmitri Wells, platform optimization specialist, working with Felix Rossi on audio production.

PODCAST SCRIPT RULES (non-negotiable):
- This is SPOKEN content. Every sentence must sound natural when read aloud. If a sentence would make someone stumble while reading it into a microphone, rewrite it.
- Structure: OPEN (warm, conversational hook, 2-3 sentences), HOOK (the core tension/question of the episode), BODY (the substance, broken into 2-4 segments), CLOSE (personal reflection + question for listeners).
- Conversational transitions, not written transitions. "So here is the thing" works. "Furthermore" does not. "And look," works. "Additionally" does not.
- Use contractions aggressively. "I've" not "I have." "It's" not "It is." "Don't" not "Do not." Spoken language contracts.
- Shorter sentences than written content. Spoken language has more periods and fewer semicolons.
- Include [PAUSE] markers where a natural beat should occur for emphasis.
- Include [SEGMENT BREAK] markers between major topic shifts.
- Episode title: front-load the searchable topic. Under 60 characters.
- No hashtags, no links, no visual formatting. This is audio.
- TARGET LENGTH: 8-12 minutes of spoken content (approximately 1200-1800 words). Do NOT cut the content short. Include ALL key points from the original draft. A 90-second script is a failure. Expand, elaborate, and breathe life into every section.
- The BODY section should be the bulk of the episode. Break it into 2-4 substantial segments with real depth, not summaries.

OUTPUT FORMAT: Return the adapted script in this exact structure:
EPISODE_TITLE: [title, under 60 chars]
SHOW_NOTES: [200-300 words for podcast platform description]
---
[OPEN]
[script text]

[HOOK]
[script text]

[BODY]
[script text with SEGMENT BREAK markers between sections]

[CLOSE]
[script text]`,
  },

  "Sunday Story": {
    platformSpec: "Substack",
    system: `You are adapting content into a Sunday Story. You are Dmitri Wells, working with the full editorial team.

SUNDAY STORY RULES (non-negotiable):
- This is NOT a marketing newsletter: never output SUBJECT:, PREVIEW:, SEO_TITLE:, or a table of contents. Title and subtitle only, then narrative body.
- This is the flagship format. It is a personal essay that reads like the best thing in someone's inbox that week.
- The Sunday Story is narrative, not instructional. It tells a story that contains an insight, rather than teaching a lesson that uses a story.
- Open with a scene, an image, or a moment. Not a thesis statement. Not "I have been thinking about..." Start in the middle of something happening.
- Longer form: 800-1500 words. This format earns its length through narrative pull, not information density.
- Paragraph rhythm matters more here than in any other format. Vary paragraph length deliberately. A one-sentence paragraph after a long one creates emphasis. Three medium paragraphs in a row creates flow. Use this.
- The insight should emerge from the story, not be bolted onto it. The reader should feel like they discovered something, not like they were told something.
- End with an image or a moment that echoes the opening, not with a CTA or a lesson summary. The best Sunday Stories land like a closing chord.
- Subheadings are optional and should be used sparingly if at all. This is not a listicle.
- The voice must be the most personal, most human version of the Voice DNA. This format rewards vulnerability and specificity.

OUTPUT FORMAT: Return the adapted Sunday Story in this exact structure:
TITLE: [evocative title, not a keyword title]
SUBTITLE: [one sentence that sets the mood without spoiling the insight]
---
[story body in markdown, no section headers unless absolutely necessary]`,
  },

  Email: {
    platformSpec: "Email Newsletter",
    system: `You are adapting content into a single send-ready email (not a long Substack issue). You are Dmitri Wells, platform optimization specialist.

EMAIL RULES:
- This is a single short email, not a newsletter issue and not a LinkedIn essay. Tight, skimmable, one primary CTA.
- One clear subject line (under 50 characters, mobile-safe).
- Preview text: 80-140 characters that completes the subject, no repetition.
- Body: mobile-first. Short paragraphs. One primary CTA. Plain, paste-ready text; minimal markdown if any (no heavy headers unless needed).
- Personal opening line, then the core argument from the draft, then one action for the reader.
- No em-dashes. No fake enthusiasm.

OUTPUT FORMAT:
SUBJECT: [subject]
PREVIEW: [preview text]
---
[email body]`,
  },

  "X Thread": {
    platformSpec: "X (formerly Twitter)",
    system: `You are adapting content into an X (Twitter) thread. You are Dmitri Wells, platform optimization specialist.

THREAD RULES:
- This is NOT paragraph prose. Each unit is its own tweet under 280 characters. Thread energy, not a chopped article.
- First post must stand alone as the hook; algorithm weight is on post 1.
- Number posts as 1/, 2/, 3/ at the start of each tweet (or use clear breaks with --- between tweets).
- Each post under 280 characters (assume standard limit). If a point needs more, split across posts.
- 1-2 hashtags only if they add discovery; otherwise none.
- Conversational, specific, no thread-bait clichés.
- No em-dashes.

OUTPUT FORMAT: Return ONLY the thread, one tweet per block separated by a line with only --- between tweets. No commentary.`,
  },

  "Executive Brief": {
    platformSpec: "Executive Brief",
    system: `You are adapting content into an Executive Brief: a standalone decision document for a busy principal.

RULES:
- Principal skim mode: lead with what to decide, not a scenic cold open. Context may keep short narrative beats, concrete examples, and specifics from the source when they change what the principal believes. Condense, do not flatten into generic summary.
- Maximum length: roughly two pages of prose when printed (tight, not padded).
- Sections (use clear ## headings in markdown): Decision Required, Context, Recommendation, Risks / Unknowns, Next Step.
- The recommendation must be one clear choice or a forced tradeoff, not a list of options with no position.
- No em-dashes. No generic consulting filler.

OUTPUT FORMAT: Return ONLY the brief in markdown with the sections above.`,
  },

  "YouTube Description": {
    platformSpec: "YouTube",
    system: `You are adapting content into YouTube packaging: title, description, and optional chapters. You are Dmitri Wells, platform optimization specialist.

RULES:
- This is packaging for a video surface, not a blog article. Front-load discovery language; avoid long expository paragraphs in the first screen.
- Video title: under 70 characters, front-loads the topic, no clickbait emptiness.
- Description: first 2-3 lines are the hook (what viewers get); then fuller summary; then keywords naturally woven in; optional TIMESTAMPS block if the draft implies sections.
- Include a single clear CTA (subscribe, next video, link in comments policy as you judge).
- No em-dashes.

OUTPUT FORMAT:
TITLE: [video title]
---
[full description + optional timestamps]`,
  },
};

/** Client may send legacy tab names; normalize to FORMAT_INSTRUCTIONS keys. */
const FORMAT_INPUT_ALIASES = {
  Thread: "X Thread",
  "Podcast Script": "Podcast",
};

function channelDifferentiationBlock(effectiveFormat) {
  return `## CHANNEL-UNIQUE REWRITE (MANDATORY)
You are producing ONLY the **${effectiveFormat}** version. The same draft may become seven other channel outputs elsewhere. Your output must not be interchangeable with any of them.

Rules:
- **Recompose** the ideas: keep claims, stakes, proper nouns, and numbers faithful to the source, but write new sentences, new paragraph order, and a hook that this channel would actually open with.
- **Do not** paste or lightly tweak consecutive paragraphs from the source. If a paragraph still resembles the source aside from a few word swaps, rewrite it from scratch.
- **Do not** reuse the source’s opening one or two sentences verbatim unless you are deliberately quoting a short fragment (almost never needed here).
- Match this channel’s length, rhythm, and scaffolding (headings, markers, metadata blocks) even if that means aggressive compression or expansion versus the draft.
`;
}

function sanitizeContent(text) {
  if (!text) return text;
  let result = text.replace(/\s*\u2014\s*/g, ", ");
  result = result.replace(/\s+\u2013\s+/g, ", ");
  result = result.replace(/, ,/g, ",").replace(/,\./g, ".").replace(/,\s*,/g, ",");
  return result;
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

  const {
    draft,
    format,
    voiceDnaMd,
    brandDnaMd,
    methodDnaMd,
    userId,
    wrapConstraintSupplement,
    /** WorkSession: Reed-locked checklist, same shape as /api/generate. */
    structuredIntake,
  } = req.body || {};
  if (!draft) return res.status(400).json({ error: "draft is required" });
  if (!format) return res.status(400).json({ error: "format is required" });

  const effectiveFormat = FORMAT_INPUT_ALIASES[format] || format;
  const formatConfig = FORMAT_INSTRUCTIONS[effectiveFormat];
  if (!formatConfig) {
    return res.status(400).json({ error: `Unknown format: ${format}` });
  }

  let resources = { voiceDna: "", brandDna: "", methodDna: "", references: "", composerMemory: "" };
  if (userId) {
    try {
      resources = await getUserResources(userId, { caller: "adapt-format" });
    } catch (e) {
      console.error("[adapt-format] Failed to load resources", e);
    }
  }

  const dmitriSpec = loadPrompt("dmitri-platform.md") || "";

  let system = `${formatConfig.system}\n\n${channelDifferentiationBlock(effectiveFormat)}`;

  const L = DNA_LIMITS.adapt;
  const methodDna = methodDnaMd || resources.methodDna;
  if (methodDna?.trim()) {
    system += methodDnaSystemAppendix(methodDna, L.method);
  }

  const voiceDna = voiceDnaMd || resources.voiceDna;
  if (voiceDna) {
    system += `\n\nVOICE DNA (ACTIVE CONSTRAINT, write in this voice from the first word):\n${clipDna(voiceDna, L.voice)}`;
  }

  const brandDna = brandDnaMd || resources.brandDna;
  if (brandDna) {
    system += `\n\nBRAND DNA:\n${clipDna(brandDna, L.brand)}`;
  }

  dnaDebug("adapt-format.handler", {
    hasUserId: !!userId,
    voiceDnaMdLen: (voiceDnaMd || "").length,
    brandDnaMdLen: (brandDnaMd || "").length,
    methodDnaMdLen: (methodDnaMd || "").length,
    effectiveVoiceLen: (voiceDna || "").length,
    effectiveBrandLen: (brandDna || "").length,
    effectiveMethodLen: (methodDna || "").length,
    voiceFromBody: !!(voiceDnaMd || "").trim(),
    brandFromBody: !!(brandDnaMd || "").trim(),
    methodFromBody: !!(methodDnaMd || "").trim(),
  });

  system += formatStructuredIntakeForPrompt(structuredIntake);

  const platformSection = dmitriSpec.split(`### ${formatConfig.platformSpec}`)[1];
  if (platformSection) {
    const nextSection = platformSection.indexOf("\n### ");
    const relevantSpec = nextSection > 0 ? platformSection.slice(0, nextSection) : platformSection.slice(0, 2000);
    system += `\n\nPLATFORM SPECIFICATIONS (from Dmitri Wells, platform optimization specialist):\n${relevantSpec.slice(0, 2000)}`;
  }

  system += "\n\nCRITICAL FORMATTING RULE: Never use em-dashes (the long dash character) anywhere in your output. Use commas, periods, colons, or semicolons instead. This is non-negotiable.";

  if (wrapConstraintSupplement && typeof wrapConstraintSupplement === "string" && wrapConstraintSupplement.trim()) {
    const clip = wrapConstraintSupplement.trim().slice(0, 6000);
    system += `\n\nSOURCE TYPE CONSTRAINTS (apply together with channel rules; if a conflict appears, obey the stricter platform safety limits):\n${clip}`;
  }

  const userContent = `DESTINATION CHANNEL: ${effectiveFormat}
The text below is SOURCE MATERIAL, not a layout to paste. Transform it into a native ${effectiveFormat} artifact. Same topic and substance; different surface, structure, and sentence fabric than the source or than any other channel would use.

SOURCE DRAFT:
${draft.slice(0, 12000)}

Output only the final ${effectiveFormat} deliverable, following every rule above. No preamble or meta commentary.`;

  console.log(`[adapt-format] Adapting for ${effectiveFormat} (requested as "${format}", draft: ${draft.length} chars)`);
  const startTime = Date.now();

  try {
    const client = new Anthropic({ apiKey });
    // Podcast scripts need more tokens for full-length episodes (target 8-12 min read)
    const tokenLimit =
      effectiveFormat === "Podcast"
      || effectiveFormat === "Executive Brief"
      || effectiveFormat === "Sunday Story"
      || effectiveFormat === "Newsletter"
        ? 6144
        : 4096;
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: tokenLimit,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
      1
    );

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const sanitized = sanitizeContent(text);
    const duration = Date.now() - startTime;

    console.log(`[adapt-format] ${effectiveFormat} complete (${duration}ms, ${sanitized.length} chars)`);

    let metadata = {};
    let body = sanitized;

    if (effectiveFormat === "Newsletter" || effectiveFormat === "Email") {
      const subjectMatch = sanitized.match(/^SUBJECT:\s*(.+)$/m);
      const previewMatch = sanitized.match(/^PREVIEW:\s*(.+)$/m);
      const seoMatch = sanitized.match(/^SEO_TITLE:\s*(.+)$/m);
      const bodyStart = sanitized.indexOf("---");
      if (subjectMatch) metadata.subject = subjectMatch[1].trim();
      if (previewMatch) metadata.preview = previewMatch[1].trim();
      if (seoMatch) metadata.seoTitle = seoMatch[1].trim();
      if (bodyStart > 0) body = sanitized.slice(bodyStart + 3).trim();
    }

    if (effectiveFormat === "Podcast") {
      const titleMatch = sanitized.match(/^EPISODE_TITLE:\s*(.+)$/m);
      const notesMatch = sanitized.match(/^SHOW_NOTES:\s*([\s\S]*?)(?=^---)/m);
      const bodyStart = sanitized.lastIndexOf("---");
      if (titleMatch) metadata.episodeTitle = titleMatch[1].trim();
      if (notesMatch) metadata.showNotes = notesMatch[1].trim();
      if (bodyStart > 0) body = sanitized.slice(bodyStart + 3).trim();
    }

    if (effectiveFormat === "Sunday Story") {
      const titleMatch = sanitized.match(/^TITLE:\s*(.+)$/m);
      const subtitleMatch = sanitized.match(/^SUBTITLE:\s*(.+)$/m);
      const bodyStart = sanitized.indexOf("---");
      if (titleMatch) metadata.title = titleMatch[1].trim();
      if (subtitleMatch) metadata.subtitle = subtitleMatch[1].trim();
      if (bodyStart > 0) body = sanitized.slice(bodyStart + 3).trim();
    }

    if (effectiveFormat === "YouTube Description") {
      const titleMatch = sanitized.match(/^TITLE:\s*(.+)$/m);
      const bodyStart = sanitized.indexOf("---");
      if (titleMatch) metadata.videoTitle = titleMatch[1].trim();
      if (bodyStart > 0) body = sanitized.slice(bodyStart + 3).trim();
    }

    return res.status(200).json({
      format,
      content: body,
      metadata,
      durationMs: duration,
    });
  } catch (err) {
    console.error(`[adapt-format] ${effectiveFormat} FAILED:`, err.message);
    return res.status(500).json({
      error: `Adaptation failed for ${effectiveFormat}`,
      fallback: true,
    });
  }
}
