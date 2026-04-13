/** Static educational copy for Brand DNA fields (URL, chat, or merged profiles). */

export type BrandFieldGuide = {
  field: string;
  title: string;
  summary: string;
  paragraphs: string[];
};

export const BRAND_FIELD_GUIDES: BrandFieldGuide[] = [
  {
    field: "brand_promise",
    title: "Brand promise",
    summary: "The outcome you claim for the people you serve, in language the site actually uses.",
    paragraphs: [
      "This is not a generic mission statement filler. It is the through line that shows up in hero copy, case studies, and CTAs. Reed weights it heavily when choosing angles so drafts stay aligned with what you say you deliver.",
      "When the promise is sharp, Work and Wrap can stress proof and stakes without inventing a softer story. When it is implicit, Reed still infers it from repeated claims and ties those claims together for consistency.",
    ],
  },
  {
    field: "tone_of_voice",
    title: "Tone of voice",
    summary: "How the brand sounds when it is being itself: heat, distance, humor, and authority.",
    paragraphs: [
      "Tone is operational. It decides whether a sentence starts with empathy, command, or evidence. Reed uses this block to keep paragraphs from sliding into default \"professional friendly\" if your brand is actually blunt, lyrical, or clinical.",
      "If you add voice guidelines or sample decks later, tone is where those additions merge. The goal is one believable voice across formats, not a different persona per channel.",
    ],
  },
  {
    field: "the_enemy",
    title: "What you stand against",
    summary: "The lazy default, bad practice, or wrong philosophy your brand rejects out loud.",
    paragraphs: [
      "Clear enemy language gives Reed guardrails: what not to sound like, what not to validate, which buzzwords to starve. It also helps differentiation so content does not read like category wallpaper.",
      "Strong enemy definition makes Wrap safer when adapting to punchy channels. The system knows which rhetorical moves would betray your positioning.",
    ],
  },
  {
    field: "target_audience",
    title: "Who you write for",
    summary: "The reader or buyer the site keeps addressing, including sophistication and pressure they are under.",
    paragraphs: [
      "Audience shapes examples, risk tolerance, and how much context you front-load. Reed uses this to choose analogies, proof density, and whether to write to a practitioner, a buyer, or a board.",
      "If you enrich with internal personas or segments later, this field should absorb that detail so every session inherits the same picture of who is on the other side of the screen.",
    ],
  },
  {
    field: "content_patterns",
    title: "Content patterns",
    summary: "How the site structures headlines, proof, and calls to action when it is performing well.",
    paragraphs: [
      "Patterns include rhythm of H1 then subheads, how quotes appear, whether proof is stat-first or story-first, and how CTAs close sections. Reed mirrors these habits so new pieces feel like siblings of what already works on your domain.",
      "This is where uploaded marketing reports help. They show how the brand behaves off-site, not only in marketing pages, so Reed can align long-form and social to the same habits.",
    ],
  },
  {
    field: "signature_phrases",
    title: "Signature phrases and never-say",
    summary: "Language the brand repeats proudly, and language it would never touch.",
    paragraphs: [
      "Signatures are anchors: short clauses readers associate with you. Never-say lists protect you from phrases that read as inauthentic or hostile to your values.",
      "Reed treats these lists as hard preferences in generation and as quick checks in editorial gates so drafts do not accidentally borrow competitor clichés you explicitly avoid.",
    ],
  },
];

export function getBrandFieldGuide(field: string): BrandFieldGuide | undefined {
  return BRAND_FIELD_GUIDES.find(g => g.field === field);
}
