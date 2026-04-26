import Anthropic from "@anthropic-ai/sdk";
import { scoreContent } from "./_score.js";
import { getUserResources } from "./_resources.js";
import { clipDna, DNA_LIMITS, methodDnaSystemAppendix } from "./_dnaContext.js";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";
import { dnaDebug } from "./_dnaDebugLog.js";
import { formatStructuredIntakeForPrompt } from "./_structuredIntakePrompt.js";
import { setCorsHeaders } from "./_cors.js";

function sanitizeContent(text) {
  if (!text) return text;
  let result = text.replace(/\s*\u2014\s*/g, ", ");
  result = result.replace(/\s+\u2013\s+/g, ", ");
  result = result.replace(/, ,/g, ",").replace(/,\./g, ".").replace(/,\s*,/g, ",");
  return result;
}

const TARGETED_EXCERPT_MAX_CHARS = 12000;

function parseTargetedRevisionExcerpt(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const inner = fence ? fence[1].trim() : t;
  const m = inner.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (typeof o.revisedExcerpt === "string" && o.revisedExcerpt.trim()) return o.revisedExcerpt.trim();
  } catch {
    /* fall through */
  }
  return null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });

  const {
    conversationSummary = "",
    outputType = "freestyle",
    voiceProfile = null,
    outline = null,
    thesis = "",
    revisionNotes = "",
    originalDraft = "",
    edits = null,
    revisionScope = "full",
    sectionExcerpt = "",
  } = req.body;

  const rawTalkMins = req.body?.talkDurationMinutes;
  const talkDurationMinutes =
    typeof rawTalkMins === "number" && Number.isFinite(rawTalkMins)
      ? Math.min(180, Math.max(3, Math.round(rawTalkMins)))
      : null;

  /** WorkSession sends Reed-locked checklist; read in system prompt below. */
  const structuredIntake = req.body?.structuredIntake;

  const trimmedRevisionNotes = String(revisionNotes || "").trim();
  const trimmedSectionExcerpt = typeof sectionExcerpt === "string" ? sectionExcerpt.trim() : "";
  const isTargetedRevision =
    revisionScope === "targeted" &&
    trimmedSectionExcerpt.length > 0 &&
    trimmedRevisionNotes.length > 0;

  let resources = { voiceDna: "", brandDna: "", methodDna: "", references: "", composerMemory: "" };
  const userId = req.body?.userId;
  if (userId && !isTargetedRevision) {
    try {
      resources = await getUserResources(userId, { caller: "generate" });
    } catch (e) {
      console.error("[api/generate] Failed to load resources", e);
    }
  }

  dnaDebug("generate.handler", {
    hasUserId: !!userId,
    hasComposerMemory: !!(resources.composerMemory && String(resources.composerMemory).trim()),
    skippedResources: isTargetedRevision,
  });

  console.log("[generate] Voice DNA length:", resources.voiceDna?.length || 0);
  console.log("[generate] Brand DNA length:", resources.brandDna?.length || 0);
  console.log("[generate] Method DNA length:", resources.methodDna?.length || 0);
  console.log("[generate] Request received:", req.method, Object.keys(req.body || {}));

  const G = DNA_LIMITS.generate;

  try {
    const client = new Anthropic({ apiKey });

    if (isTargetedRevision) {
      const clippedExcerpt =
        trimmedSectionExcerpt.length > TARGETED_EXCERPT_MAX_CHARS
          ? `${trimmedSectionExcerpt.slice(0, TARGETED_EXCERPT_MAX_CHARS)}\n\n[TRUNCATED_FOR_REVISION]`
          : trimmedSectionExcerpt;

      let targetedSystem = `You are a fast line editor. You receive ONE excerpt from a longer draft (plain text). Revise ONLY that excerpt to satisfy the instruction.

RULES:
1. Match the excerpt's existing voice, register, and formatting. Do not shift genre or add frameworks or brands that are not already implied in the excerpt.
2. Make the minimum change that fulfills the instruction. If the instruction asks to cut length, actually remove words.
3. Never use em-dashes. Never use the word "vibe" or "vibes."
4. Output ONLY valid JSON with a single key "revisedExcerpt" whose value is the replacement text for the excerpt (plain text, same internal paragraph breaks as needed). No markdown fences, no commentary.`;

      if (outputType === "talk") {
        targetedSystem +=
          "\n\nSPOKEN TALK SCRIPT: preserve short paragraphs and any inline [pause] or [beat] markers. Do not add ## headings or footnotes.";
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Targeted revision timed out after 45 seconds")), 45000)
      );

      const response = await Promise.race([
        callWithRetry(() =>
          client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: Math.min(req.body.maxTokens || 2048, 4096),
            system: targetedSystem,
            messages: [
              {
                role: "user",
                content: `EXCERPT:\n${clippedExcerpt}\n\nINSTRUCTION:\n${trimmedRevisionNotes}`,
              },
            ],
          })
        ),
        timeoutPromise,
      ]);

      const raw =
        response.content?.[0]?.type === "text" ? response.content[0].text : "";
      let revisedExcerpt = parseTargetedRevisionExcerpt(raw);
      if (!revisedExcerpt) revisedExcerpt = sanitizeContent(raw).trim();
      if (!revisedExcerpt) {
        return res.status(500).json({ error: "Empty revision result.", content: null });
      }

      return res.json({
        content: revisedExcerpt,
        revisedExcerpt,
        targeted: true,
        score: null,
        gates: null,
      });
    }

    let system = `You are producing a single piece of content for EVERYWHERE Studio. Use the captured conversation to write in the user's voice. Output only the final content. No meta-commentary, no preamble, no "Here is your essay:" headers. Format appropriately for the type: ${outputType}.

GENERATION QUALITY RULES (non-negotiable):

1. PROMISE-DELIVERY: Before completing any piece that promises to reveal, teach, or show something, identify the single specific tactic, example, or scene that delivers on that promise. If you wrote "we're about to break down exactly how it works," the next paragraph MUST contain the actual breakdown, not more setup.

2. FIRST-MENTION ONLY: Once a concept is introduced, it is consumed. Do not restate the same idea in different words. If "meeting prep as intelligence briefing" is established in paragraph 2, do not re-explain it in paragraph 5. Move forward.

3. NO BORROWED LANGUAGE: Do not use LinkedIn-influencer vocabulary: "influence architecture," "code-switching at the highest level," "can't unsee it," "game-changer," "unlock," "leverage." Write in the user's actual voice, not internet-marketing register.

4. VOICE-FIRST GENERATION: If Voice DNA appears in this prompt (after any Method DNA block), write IN that voice from the first word of the draft. Do not write generically and then adjust. The voice shapes sentence structure, word choice, and rhythm from the start.

5. HOOK RESOLUTION: If your opening line creates an implicit question (e.g., "Someone just handed me the most honest document"), answer that question in the same paragraph. Never leave a hook's implicit question unresolved.

6. NO SCAFFOLDING: Do not tell the reader how to feel about what you are showing them. No "This is my actual playbook." No "This is influence architecture at its finest." Show the content. Trust it. Remove all metacommentary that explains why the piece is valuable.

7. CTA VOICE MATCH: The closing call-to-action must match the voice of the entire piece. No generic "Ready to build your own framework? Access my complete system." Write the CTA in the same register, personality, and tone as the rest of the draft.

8. NO FILLER EXPANSION: Do not circle back to restate concepts to fill length. If the piece makes its point in 600 words, it is 600 words. Do not pad to reach a word count.`;
    system += formatStructuredIntakeForPrompt(structuredIntake);
    if (voiceProfile) {
      system += `\n\nUSER VOICE PROFILE:\n- Role: ${voiceProfile.role}\n- Audience: ${voiceProfile.audience}\n- Tone: ${voiceProfile.tone}\n- Writing sample: "${voiceProfile.writing_sample?.slice(0, 600)}"\n\nMatch this person's voice exactly.`;
    }
    if (resources.methodDna?.trim()) {
      system += methodDnaSystemAppendix(resources.methodDna, G.method);
    }
    if (resources.voiceDna) {
      system += `\n\nVOICE DNA (ACTIVE CONSTRAINT):
The following Voice DNA defines how this person writes. This is not a reference. This is the voice you must inhabit from the first sentence.

Before writing each paragraph, internalize:
- What sentence structures does this person use?
- What is their typical paragraph length?
- Do they use questions? Asides? Direct address?
- What register do they write in: conversational, analytical, narrative, instructional?
- What words would this person NEVER use?

VOICE DNA:
${clipDna(resources.voiceDna, G.voice)}

If you catch yourself writing a sentence this person would never say, delete it and rewrite it in their voice. Voice match is not cosmetic. It is structural.`;
    }
    if (resources.brandDna) {
      system += `\n\nBRAND DNA (ACTIVE CONSTRAINT):
The following Brand DNA defines this person's brand identity. Write content that embodies this brand from the first word. Do not treat this as a checklist to verify after writing. Let it shape your word choice, tone, and framing throughout.

BRAND DNA:
${clipDna(resources.brandDna, G.brand)}`;
    }
    if (resources.references) {
      system += "\n\nREFERENCE MATERIALS:\n" + clipDna(resources.references, 12000);
    }

    system += `

WRITING RULES (MANDATORY):
- Never use the word "vibe" or "vibes." Use atmosphere, energy, tone, character, or feel.
- Never use em-dashes. Use commas, periods, colons, or restructure sentences.
- No italics.
- No AI tells: "It is worth noting," "In conclusion," "Moreover," "Importantly," "Great question," "Certainly."
- No symmetrical paragraph structure (all paragraphs same length, same setup/payoff).
- No conclusions that resolve everything. Leave something open.
- No emotional flatness at high-stakes moments.
- No hedging ("I think," "maybe," "perhaps") unless the Composer's Voice DNA specifically includes hedging patterns.
- Active voice by default. Passive only for deliberate rhetorical effect.

SLOP PREVENTION (apply during generation, not just in checkpoints):
SLOP = Superfluity, Loops, Overwrought prose, Pretension.
- Zero padding. Every sentence must earn its place.
- Zero repetition. Never state the same idea twice in different words.
- Zero false sophistication. If a simpler word works, use it.
- Zero AI fingerprints. No transitional phrases statistically common in AI output ("alongside that," "threaded through," "to make this concrete," "running through all of that").

HOOK REQUIREMENT:
The first 7 seconds of reading must create curiosity, recognition, tension, or surprise. If the reader does not feel something in the first line, they leave. The hook must earn the rest.

QUOTABLE MOMENTS:
Every piece must contain 3-5 quotable moments: lines sharp enough that a reader would screenshot them, highlight them, or share them. These should feel inevitable in context but surprising in isolation.

FORMATTING:
Do not use markdown formatting in the output. No asterisks for bold. No hashtags for headings. Output plain text only. The title should be the first line, plain text, no formatting.`;

    // Add outline to system prompt if provided
    if (outline && Array.isArray(outline) && outline.length > 0) {
      system += "\n\nSTRUCTURE TO FOLLOW (write each section in order):\n";
      outline.forEach((section, i) => {
        system += `\nSection ${i + 1}: ${section.section}\n`;
        if (section.beats && section.beats.length > 0) {
          system += "Key points to hit:\n";
          section.beats.forEach(beat => {
            system += `- ${beat}\n`;
          });
        }
        if (section.purpose) {
          system += `Purpose: ${section.purpose}\n`;
        }
      });
    }

    if (thesis) {
      system += `\n\nCORE THESIS (this is the one thing the piece argues): ${thesis}\n`;
    }

    if (outputType === "talk" && outline && Array.isArray(outline) && outline.length > 0) {
      const m = talkDurationMinutes ?? 15;
      const targetWords = m * 300;
      system += `

OUTPUT TYPE: talk (spoken script, not an essay). Aim near ${targetWords} words for roughly ${m} minutes at about 300 spoken words per minute, within the token limit you have.
TALK STRUCTURE: Short paragraphs. No ## headings or subheads. No footnotes, citations block, or academic section labels. Natural spoken transitions for the ear. Use inline [pause] or [beat] where a speaker would breathe or land emphasis (exactly those bracket labels, lowercase inside the brackets). Plain text only; first line is the title, no markdown.`;
    }

    // Build the user message based on mode: outline-based, revision, or standard
    let userContent;
    if (revisionNotes || originalDraft) {
      // Revision mode: surgical editing with voice preservation
      system = `You are a surgical editor. You are revising an existing draft.

ABSOLUTE RULES:
1. PRESERVE THE AUTHOR'S VOICE. Do not change the tone, style, or personality. If the original is personal and reflective, the revision must be personal and reflective. If it's casual, keep it casual.
2. DO NOT ADD NEW CONCEPTS, FRAMEWORKS, PRODUCTS, OR BRAND NAMES that don't exist in the original. If a framework name doesn't appear in the original, don't add it.
3. DO NOT EXPAND. If the original is 800 words, the revision should be approximately 800 words. Revision means fixing, not growing.
4. DO NOT SHIFT THE REGISTER. If the original is a personal essay, don't turn it into a white paper. If it's a story, don't turn it into a pitch deck.
5. ONLY FIX WHAT WAS FLAGGED. Read the revision notes carefully. Fix those specific issues. Leave everything else untouched.
6. If the revision notes say "fix repetition," CUT the redundant sections. Don't rephrase them.
7. If the revision notes say "source claims," either add a credible source or soften the claim to "some research suggests" or remove it. Do NOT invent sources.
8. NEVER add consulting language, sales copy, or strategic frameworks unless they existed in the original.
9. PRESERVE ALL FORMATTING. If the original uses markdown headings (##), bold (**text**), or other formatting, the revision must maintain identical formatting. Do not strip headings, subheads, or structural markers, unless the piece is a spoken talk script (outputType talk): then keep plain paragraphs and inline [pause] or [beat] markers only, never add ## headings.

YOUR JOB: Make the minimum changes necessary to address the specific feedback. A good revision is one where a reader can barely tell what changed, but the flagged issues are gone.

CRITICAL FORMATTING RULE: Never use em-dashes (the long dash character) anywhere in your output. Use commas, periods, colons, or semicolons instead.
WORD BAN: Never use the word "vibes" or "vibe." Use atmosphere, energy, tone, character, or feel instead.

Output ONLY the complete revised draft. No commentary, no explanation.`;
      system += formatStructuredIntakeForPrompt(structuredIntake);

      if (resources.methodDna?.trim()) {
        system += methodDnaSystemAppendix(resources.methodDna, G.method);
      }
      if (resources.voiceDna) {
        system += "\n\nVOICE DNA - The revision MUST match this voice:\n" + clipDna(resources.voiceDna, G.voice);
      }
      if (resources.brandDna) {
        system += "\n\nBRAND DNA:\n" + clipDna(resources.brandDna, G.brand);
      }

      if (outputType === "talk") {
        const m = talkDurationMinutes ?? 15;
        system += `\n\nSPOKEN TALK SCRIPT: keep short paragraphs, inline [pause] and [beat] markers, no ## headings, no footnotes. If length must shift, stay near ${m * 300} words for about ${m} minutes spoken unless revision notes say otherwise.`;
      }

      let revisionParts = [`ORIGINAL DRAFT:\n${originalDraft.slice(0, 8000)}`];
      if (edits && Array.isArray(edits) && edits.length > 0) {
        revisionParts.push(`\nUSER EDITS (apply these exactly, do not blend or paraphrase):\n${edits.map(e => `Paragraph ${e.paragraphIndex}: ${e.newText}`).join("\n")}`);
      }
      if (revisionNotes.trim()) {
        revisionParts.push(`\nREVISION NOTES:\n${revisionNotes}`);
      }
      userContent = revisionParts.join("\n\n");
    } else if (outline && Array.isArray(outline) && outline.length > 0) {
      // Outline-based generation: follow the beat sheet
      const outlineText = outline.map((s, i) => `Section ${i + 1}: ${s.section}\nBeats: ${(s.beats || []).join("; ")}\nPurpose: ${s.purpose || ""}`).join("\n\n");
      userContent = `Conversation summary:\n${conversationSummary}\n\n${thesis ? `Thesis: ${thesis}\n\n` : ""}Outline (follow this structure section by section, hit every beat):\n${outlineText}\n\nProduce the ${outputType} now. Follow the outline exactly.\n\nCRITICAL: Every section that promises to show, teach, or reveal something must contain the specific example, tactic, or scene that delivers on that promise. Setup without payoff is the single most common failure mode. Prioritize concrete delivery over abstract framing.`;
    } else {
      // Standard generation
      userContent = `Conversation summary:\n${conversationSummary}\n\nProduce the ${outputType} now.`;
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Generation timed out after 60 seconds")), 60000)
    );

    const response = await Promise.race([
      callWithRetry(() =>
        client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: Math.min(req.body.maxTokens || 4096, 8192),
          system,
          messages: [{ role: "user", content: userContent }],
        })
      ),
      timeoutPromise,
    ]);

    let content = sanitizeContent(response.content?.[0]?.type === "text" ? response.content[0].text : "");

    // ── Back-of-house auto-revision pass ──────────────────────
    // Only run on new generation (not revisions) to avoid double-revising
    if (!revisionNotes && !originalDraft && content) {
      try {
        // Step 1: Internal quality review
        const reviewResponse = await callWithRetry(() =>
          client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: `You are an internal quality reviewer. Read this draft and identify the 3 most critical issues from this checklist:
- Repeated concepts (same idea restated in different words)
- Promises without delivery (setup without specific examples/tactics)
- Borrowed language (LinkedIn-speak, consulting jargon not in the voice DNA)
- Unresolved hooks (opening creates a question that is never answered)
- Scaffolding (telling the reader how to feel instead of showing)
- Generic CTA (closing that sounds like a template, not a person)

Return ONLY valid JSON: { "issues": ["issue 1 description", "issue 2", "issue 3"], "needsRevision": true/false }
If the draft has no critical issues, return { "issues": [], "needsRevision": false }`,
            messages: [{ role: "user", content: `Review this draft:\n\n${content.slice(0, 6000)}` }],
          })
        );

        const reviewText = reviewResponse.content?.[0]?.type === "text" ? reviewResponse.content[0].text : "";
        let reviewResult = { issues: [], needsRevision: false };
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
          if (jsonMatch) reviewResult = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          console.error("[api/generate][review-parse]", parseErr);
        }

        // Step 2: Auto-revise if needed
        if (reviewResult.needsRevision && reviewResult.issues.length > 0) {
          // 2-second delay to avoid 429s
          await new Promise((r) => setTimeout(r, 2000));

          const revisionSystemPrompt = `You are a surgical editor. You are revising an existing draft.

ABSOLUTE RULES:
1. PRESERVE THE AUTHOR'S VOICE. Do not change the tone, style, or personality.
2. DO NOT ADD NEW CONCEPTS, FRAMEWORKS, PRODUCTS, OR BRAND NAMES that don't exist in the original.
3. DO NOT EXPAND. Revision means fixing, not growing.
4. DO NOT SHIFT THE REGISTER.
5. ONLY FIX WHAT WAS FLAGGED. Fix these specific issues. Leave everything else untouched.
6. If the issue is repetition, CUT the redundant sections. Don't rephrase them.
7. PRESERVE ALL FORMATTING.

CRITICAL FORMATTING RULE: Never use em-dashes (the long dash character) anywhere in your output. Use commas, periods, colons, or semicolons instead.
WORD BAN: Never use the word "vibes" or "vibe." Use atmosphere, energy, tone, character, or feel instead.

Output ONLY the complete revised draft. No commentary, no explanation.`
            + formatStructuredIntakeForPrompt(structuredIntake)
            + (resources.methodDna?.trim()
              ? methodDnaSystemAppendix(resources.methodDna, G.method)
              : "")
            + (resources.voiceDna ? `\n\nVOICE DNA - The revision MUST match this voice:\n${clipDna(resources.voiceDna, G.voice)}` : "")
            + (resources.brandDna ? `\n\nBRAND DNA:\n${clipDna(resources.brandDna, G.brand)}` : "");

          const revisionResponse = await callWithRetry(() =>
            client.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 4096,
              system: revisionSystemPrompt,
              messages: [{ role: "user", content: `ORIGINAL DRAFT:\n${content}\n\nREVISION NOTES:\nFix these issues identified by internal review:\n${reviewResult.issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}` }],
            })
          );

          const revisedContent = sanitizeContent(revisionResponse.content?.[0]?.type === "text" ? revisionResponse.content[0].text : "");
          if (revisedContent && revisedContent.length > content.length * 0.5) {
            content = revisedContent;
            console.log("[api/generate] Back-of-house revision applied for issues:", reviewResult.issues);
          }
        }
      } catch (bohErr) {
        // Non-fatal: if back-of-house review fails, return the original draft
        console.error("[api/generate][back-of-house]", bohErr);
      }
    }

    let gates = null;
    let score = 900;
    try {
      const scores = await scoreContent({ apiKey, content, outputType, voiceProfile });
      gates = scores;
      if (typeof scores?.total === "number") {
        score = scores.total;
      }
    } catch (err) {
      console.error("[api/generate][score]", err);
    }

    return res.json({ content, score, gates });
  } catch (err) {
    console.error("[api/generate] Error:", err);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
      content: null,
    });
  }
}
