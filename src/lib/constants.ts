export const MARKETING_NUMBERS = {
  specialistCount: 40,
  outputFormatCount: 12,
  qualityCheckpoints: 7,
  impactThreshold: 75,
  betterishThreshold: 75, // Internal pipeline bar; not shown as a numeric score in the product UI
  voiceDnaTarget: 95,
} as const;

export const APP_VERSION = "Beta 1.10";

// CO_029 F9: chips can now declare a non-chat action. When action is set,
// the shell dispatches a window event instead of prefilling the composer,
// so "What needs fixing?" focuses the on-page flagged-items card.
export type ReedStageChip = { label: string; prefill: string; action?: "show_flagged_items" };

export const REED_STAGE_CHIPS: Record<string, ReedStageChip[]> = {
  Watch: [
    { label: "Turn signal into brief", prefill: "Turn the strongest signal this week into a content brief for me." },
    { label: "What should I write about?", prefill: "Based on this week's signals, what's the most timely thing for me to write about?" },
    { label: "Who went quiet?", prefill: "Which competitors went quiet this week and what does that mean for my positioning?" },
  ],
  Intake: [
    { label: "Who is the audience?", prefill: "Help me get specific about who this is for. Not a demographic. A person." },
    { label: "What is the goal?", prefill: "What do I want to happen after they read this? Not what I want to write. What I want to change." },
    { label: "What is in it for them?", prefill: "What does the reader get from this? Help me see it from their side." },
    { label: "What is my angle?", prefill: "I have a general topic. Help me find the sharpest angle into it." },
  ],
  Outline: [
    { label: "Does the structure hold?", prefill: "Read my outline and tell me if the structure holds. Where is the logic weakest?" },
    { label: "Sharpen my hook", prefill: "How can I sharpen the opening hook? What's the strongest way to start this?" },
    { label: "Is the close strong?", prefill: "Does my closing section deliver on what the hook promised?" },
    { label: "What's missing?", prefill: "What's the one thing this outline is missing that would make it significantly stronger?" },
  ],
  Edit: [
    { label: "Tighten this", prefill: "This piece is running long. Cut to the target word count without losing the argument. Show me what to remove." },
    { label: "Find my weakest sentence", prefill: "Find the single weakest sentence in this draft and tell me why it is weak." },
    { label: "Fix passive voice", prefill: "Find every passive construction and rewrite them as active voice." },
    { label: "Stronger opening", prefill: "Rewrite the opening paragraph to pass the 7-second hook test. Keep my voice." },
  ],
  Review: [
    { label: "What needs fixing?", prefill: "", action: "show_flagged_items" },
    { label: "Final read", prefill: "Do a final read of this piece as an adversarial editor. What would make someone stop reading?" },
    { label: "Pull the best line", prefill: "Pull the single most quotable line from this piece for social." },
    { label: "Is this ready?", prefill: "Is this ready to publish? Give me your honest assessment in two sentences." },
  ],
  Wrap: [
    { label: "Adapt for podcast", prefill: "Adapt this piece into a podcast script. Natural spoken language, same argument." },
    { label: "Write the LinkedIn post", prefill: "Write the LinkedIn version of this piece. 150 words, punchy opening." },
    { label: "Write the email subject line", prefill: "Write 3 subject line options for the newsletter version of this piece." },
    { label: "What else can I make from this?", prefill: "What other content can I extract or adapt from this piece?" },
  ],
};

export const OUTPUT_TYPES = {
  content: {
    label: "Content",
    description: "Single-session outputs that build your reputation, audience, and authority over time.",
    types: [
      { id: "essay", name: "Essay", format: ".md / .html", shortDesc: "Long-form writing that establishes your thinking on a subject." },
      { id: "podcast", name: "Podcast", format: ".md", shortDesc: "Scripted audio show in any format: solo, two hosts, interview, or panel." },
      { id: "video_script", name: "Video Script", format: ".md", shortDesc: "Scripts built for the platform. The algorithm decides in the first three seconds." },
      { id: "email", name: "Email", format: "Plain text", shortDesc: "Any email, any purpose. 2 to 3 strategic variants, each aimed at a different outcome." },
    ],
  },
  social: {
    label: "Social Media",
    description: "Content built for the interest graph. Each platform has its own rules.",
    types: [
      { id: "linkedin", name: "LinkedIn Post", format: "Plain text", shortDesc: "Short-form professional post built for the interest graph." },
      { id: "x_post", name: "X Post", format: "Plain text", shortDesc: "A short, sharp take built for speed and signal. 280 characters." },
      { id: "social_post", name: "Social Post", format: "Plain text", shortDesc: "Content adapted for Instagram, Facebook, or other platforms." },
    ],
  },
  business: {
    label: "Business",
    description: "Single-session structured documents for the normal course of business.",
    types: [
      { id: "presentation", name: "Presentation", format: ".html / .pdf", shortDesc: "A slide narrative built around what the audience needs to believe." },
      { id: "proposal", name: "Proposal", format: ".html / .pdf", shortDesc: "A document that makes the client feel understood before it asks for anything." },
      { id: "one_pager", name: "One-Pager", format: ".html / .pdf", shortDesc: "One page, one idea, one ask. The hardest document to write well." },
      { id: "report", name: "Report", format: ".pdf / .html", shortDesc: "Structured findings that enable a decision." },
      { id: "executive_summary", name: "Executive Summary", format: ".pdf / .html", shortDesc: "A standalone argument for a decision-maker. Not a shortened version." },
      { id: "case_study", name: "Case Study", format: ".html / .pdf", shortDesc: "Proof that you deliver. A story about what changed." },
      { id: "sow", name: "Statement of Work", format: ".pdf", shortDesc: "Specific, unambiguous commitments: what, when, and out of scope." },
      { id: "meeting", name: "Meeting Agenda / Recap", format: ".md / .html", shortDesc: "Pre-meeting structure or post-meeting record of what matters." },
      { id: "bio", name: "Bio / Speaker Profile", format: "Plain text", shortDesc: "All four lengths in one session plus a speaker introduction." },
      { id: "white_paper", name: "White Paper", format: ".html / .pdf", shortDesc: "Your longest bet on your own thinking. A position backed by evidence." },
    ],
  },
  extended: {
    label: "Extended",
    description: "Built across multiple sessions. Each session adds to something larger.",
    types: [
      { id: "book", name: "Book", format: ".md per chapter", shortDesc: "Your most ambitious output. A project, not a single session." },
      { id: "website", name: "Website", format: ".md / .html", shortDesc: "A full website built page by page, each page its own session." },
      { id: "newsletter", name: "Newsletter", format: ".html", shortDesc: "A recurring publication. Each issue is its own session." },
    ],
  },
  freestyle: {
    label: "Freestyle",
    description: "Thought partner mode. Open conversation with Reed. No deliverable assumed.",
    types: [
      { id: "freestyle", name: "Freestyle", format: "Conversation", shortDesc: "Think out loud with Reed. Output is optional, not required." },
    ],
  },
};

export const OUTPUT_TYPES_FULL: Record<string, { label: string; description: string; types: Array<{ id: string; name: string; what: string; reed: string; format: string; delivery: string; notFit: string }> }> = {
  content: {
    label: "Content",
    description: "Single-session outputs that build your reputation, audience, and authority over time.",
    types: [
      { id: "essay", name: "Essay", what: "Long-form writing that establishes your thinking, a clear, argued position that only you could write.", reed: "Reed asks what you actually believe and whether the safe version is worth publishing. He finds the tension, challenges weak premises, and helps you locate the real argument before a word gets written.", format: ".md for drafts. .html for publication. 2,000 to 4,000 words.", delivery: "Publication-ready article with optional pull quotes, call to action, and a social-ready excerpt.", notFit: "You want to cover a topic broadly. An essay argues one thing." },
      { id: "podcast", name: "Podcast", what: "A scripted audio show, solo, two hosts, interview, or panel. Built to sound like a real conversation.", reed: "Reed asks who you are really talking to and what you want them to feel by the end. For interviews, he builds questions for genuine revelation, not softballs.", format: ".md for the complete script with host cues. Show notes in .md. Suno prompts inline if musical bed is on.", delivery: "Full show script, host script, show notes, source links. All files production-ready.", notFit: "You want a rough outline to riff from. Reed produces a complete script." },
      { id: "video_script", name: "Video Script", what: "Scripts built for the platform. The algorithm decides in the first three seconds. Reed starts there.", reed: "Reed goes straight to the first three seconds. What does the opening frame need to do? The rest builds from that decision.", format: ".md with time-coded sections, speaker direction, and B-roll callouts. Caption version as plain text.", delivery: "Full script, B-roll prompts, caption version, and thumbnail image prompt.", notFit: "You want talking points. This is a full script." },
      { id: "email", name: "Email", what: "Any email, any purpose. Reed produces 2 to 3 strategic variants, each aimed at a different outcome.", reed: "Reed runs the Communication Framework: goal, strategy, what is in it for them, what you need them to do, what happens next. Multiple variants, different approaches.", format: "Plain text. No markdown. As short as possible, as long as necessary.", delivery: "2 to 3 variants with a brief note on the strategic difference. Copy-ready.", notFit: "You need a newsletter. That is its own output type." },
      { id: "freestyle", name: "Freestyle", what: "Open conversation with Reed. No format required. No deliverable assumed. You think out loud, Reed thinks with you.", reed: "Reed follows your lead. He asks questions, pushes back on weak premises, and reflects what he is hearing. He does not propose a structure or move toward production unless you ask. At a natural stopping point he asks one question: \"Do you want to capture any of this?\"", format: "Whatever you need. If something worth keeping emerges, Reed helps you shape it. If nothing needs to be saved, the session is complete.", delivery: "On request only. No automatic outline. No forced next step. If you want an output, Reed will ask what form it should take, then produce it. Checkpoints run only if you ask.", notFit: "You already know what you are building. Pick the output type." },
    ],
  },
  social: {
    label: "Social",
    description: "Content built for the interest graph. Each platform has its own rules. Reed knows the difference.",
    types: [
      { id: "linkedin", name: "LinkedIn Post", what: "A short-form professional post built for the interest graph, a signal to the right people that you think clearly.", reed: "Reed asks what triggered this. He finds the tension and decides: is this a story, a take, or a lesson? Strong first line that stops the scroll, middle that earns the read, close that invites a response.", format: "Plain text. No markdown. Character limit: 3,000. Optimal for reach: 900 to 1,200 characters.", delivery: "Copy-ready text. One tap to copy. Paste directly into LinkedIn.", notFit: "You have more than one idea. That is two posts." },
      { id: "x_post", name: "X Post", what: "A short, sharp take built for speed and signal. X rewards brevity, wit, and confidence.", reed: "Reed asks what you want to say and cuts until it is sharp. For threads, each post holds on its own but earns the next.", format: "Plain text. 280 characters per post. Threads as numbered posts.", delivery: "Single post or numbered thread, copy-ready.", notFit: "You need nuance or length. That is LinkedIn or an essay." },
      { id: "social_post", name: "Social Post", what: "Content adapted for Instagram, Facebook, or other platforms. Reed adapts your existing output, the format shifts to the platform.", reed: "Reed does not copy, he adapts. An essay becomes a caption with a hook. A podcast becomes a clip-worthy pull quote.", format: "Plain text. Platform-specific character limits. Visual prompts alongside.", delivery: "Caption copy and a visual direction prompt. Paste directly into the platform.", notFit: "You want a direct copy-paste. Adaptation is the point." },
    ],
  },
  business: {
    label: "Business",
    description: "Single-session structured documents a thought leader produces in the normal course of business.",
    types: [
      { id: "presentation", name: "Presentation", what: "A slide narrative built around what the audience needs to believe, not what you want to say.", reed: "Reed builds the narrative arc before a single slide is written. One thing the audience must leave with, everything else supports that.", format: ".html for interactive delivery. .pdf for printing. Via Gamma, Google Slides, or the built-in visualizer.", delivery: "Complete slide narrative with speaker notes. Visual Intelligence available.", notFit: "You are building a sales one-pager. Presentations are for audiences." },
      { id: "proposal", name: "Proposal", what: "A document that makes the client feel understood before it asks for anything.", reed: "Reed asks three questions: what does this person want, what are they afraid of, what does success look like for them.", format: ".html for digital delivery. .pdf for formal submission. Pricing left blank, investment is verbal.", delivery: "Complete proposal with optional cover email and visual companion.", notFit: "The engagement is already agreed. That is a Statement of Work." },
      { id: "one_pager", name: "One-Pager", what: "The hardest document to write well. One page, one idea, one ask. Everything else gets cut.", reed: "Reed asks what the single thing is this person needs to understand. SLOP Detection locked on, every word earns its place.", format: ".html for digital sharing. .pdf for printing. One page is the constraint.", delivery: "One-pager copy, formatted .html, formatted .pdf.", notFit: "You have more than one idea or ask. That is a proposal or presentation." },
      { id: "report", name: "Report", what: "Structured findings that enable a decision. A report is only as useful as the action it produces.", reed: "Reed asks who is reading this and what decision they need to make. Structured backward from that. Executive summary first, always.", format: ".pdf for formal delivery. .html for interactive versions. 4 to 8 pages standard.", delivery: "Full report with executive summary, findings, analysis, and recommendations.", notFit: "You want to share a point of view. That is an essay or white paper." },
      { id: "executive_summary", name: "Executive Summary", what: "A standalone argument for a decision-maker who may never read the original. Must work on its own.", reed: "Reed asks: what is the single decision this person needs to make? Everything serves that question.", format: "Half a page to two pages. .pdf for delivery. Most direct register of any output type.", delivery: "Standalone executive summary, formatted and ready to send.", notFit: "You want to summarize something for yourself. This is a decision document." },
      { id: "case_study", name: "Case Study", what: "Proof that you deliver. A story about what changed for someone because you showed up.", reed: "Reed asks: what was their world like before? What is the moment everything shifted? What does it look like now? Built from the transformation.", format: ".html for digital sharing. .pdf for leave-behinds. Client quote as pull quote graphic.", delivery: "Case study, formatted .pdf, pull quote graphic, and a social version for LinkedIn, all from one session.", notFit: "You want to describe a project. A case study tells the client's story." },
      { id: "sow", name: "Statement of Work", what: "Clarity protects both sides. An SOW translates an agreed engagement into specific, unambiguous commitments.", reed: "Reed asks what is in scope, what the deliverables are, and what is out of scope. The out-of-scope section is always on.", format: ".pdf for formal execution. Plain language. As short as the engagement allows.", delivery: "Complete SOW with deliverables, timeline, out-of-scope section, signature-ready.", notFit: "You are still selling. Finish the Proposal first." },
      { id: "meeting", name: "Meeting Agenda / Recap", what: "A pre-meeting structure or post-meeting record that captures what actually matters.", reed: "Reed identifies which of four meeting types: Information, Decision, Planning, or Relationship. For Information meetings, he asks: could this be an email instead?", format: ".md for internal use. .html for sharing. One page max.", delivery: "Agenda or recap, formatted. Action items separated and owner-assigned.", notFit: "You want a full transcript. A recap captures decisions and next steps." },
      { id: "bio", name: "Bio / Speaker Profile", what: "All four lengths in one session. Plus a speaker introduction. You never hunt for the right version again.", reed: "Reed asks what you want the reader to feel after they read this. The bio is built from that feeling backward.", format: "Plain text for all versions, bios get copied into portals, kits, and intro cards.", delivery: "Four bio lengths plus speaker intro. All clearly labeled. Copy-ready.", notFit: "You want a full profile page. That is Website Content." },
      { id: "white_paper", name: "White Paper", what: "Your longest bet on your own thinking. Establishes a position, builds the argument, leaves no doubt where you stand.", reed: "Reed runs a full premise interview. The Advisors weigh in before chapter one. Perspective and Risk checkpoint locked on.", format: ".html for digital distribution. .pdf for gated downloads. 2,500 to 6,000 words.", delivery: "Full document with executive summary, body, citations, and branded cover.", notFit: "You want to explore a topic. That is an Essay. A white paper argues a position." },
      { id: "session_brief", name: "Session Brief", what: "Takes a call, meeting, or transcript and distills it to what actually matters.", reed: "Reed asks framing questions first, then synthesizes. Goal, strategy, what is in it for them, what is required, and what happens next.", format: "Branded paginated HTML. Five sections, viewport-locked pages.", delivery: "Five-section document. You review, edit, and approve. The file is the deliverable.", notFit: "The meeting was simple and two people were in the room. A well-written email is faster." },
    ],
  },
  extended: {
    label: "Extended",
    description: "Built across multiple sessions. Each session adds to something larger.",
    types: [
      { id: "book", name: "Book", what: "Your most ambitious output. Each chapter is its own session inside a Book container.", reed: "Reed runs a discovery interview before anything is written. The Advisors weigh in before the outline. Each chapter: hook, body, bridge to next.", format: ".md per chapter. Final manuscript assembled from chapter files.", delivery: "Chapter draft with outline and optional research notes per session. Bridge paragraph available separately.", notFit: "You are not ready to commit. If you want one long argument, start with a White Paper." },
      { id: "website", name: "Website", what: "A full website built page by page. Two directions: building new or evaluating existing.", reed: "New site: strategy and sitemap first, then page by page. Audit: Reed goes in with a framework, producing findings and a priority action list.", format: "Page copy in .md for developer handoff. .html for browser-based review. SEO metadata per page.", delivery: "New site: page copy, UX notes, SEO metadata, headline variants. Audit: findings report, priority action list.", notFit: "You need a one-page marketing document. That is a One-Pager." },
      { id: "newsletter", name: "Newsletter", what: "A recurring publication that builds relationship over time. Each issue is its own session.", reed: "Reed asks what your reader needs this week, not what you want to send. Built around one clear idea, structured for scannability and depth.", format: ".html for your email platform. .md for source and archiving. Subject line and preview text delivered separately.", delivery: "Full issue in .html, subject line, preview text, and social excerpt. Paste directly into your sending platform.", notFit: "You want to send a one-time announcement. That is an Email." },
    ],
  },
};
