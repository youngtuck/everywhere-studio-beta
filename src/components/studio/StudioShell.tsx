import { useState, useRef, useEffect, useCallback } from "react";
import "../../pages/studio/shared.css";
import { ShellContext, useShell } from "./StudioShellContext";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import StudioSidebar from "./StudioSidebar";
import StudioTopBar from "./StudioTopBar";
import { StudioGlobalSearch } from "./StudioGlobalSearch";
import { ProjectProvider } from "../../context/ProjectContext";
import MobileBottomNav from "./MobileBottomNav";
import { useMobile } from "../../hooks/useMobile";
import Logo from "../Logo";
import NotificationBell from "./NotificationBell";
import { REED_STAGE_CHIPS } from "../../lib/constants";
import { useWorkStageFromShell } from "../../hooks/useWorkStageBridge";
import { ReedProfileIcon } from "./ReedProfileIcon";
import { fetchWithRetry } from "../../lib/retry";

export { useShell } from "./StudioShellContext";

// ─────────────────────────────────────────────────────────────────────────────
// ADVISORS CONTENT, context-aware per page (matches wireframe advContent object)
// ─────────────────────────────────────────────────────────────────────────────

type AdvisorCard = { role: string; text: string };
type AdvisorContext = { rec: string; cards: AdvisorCard[] };

const ADVISOR_CONTENT: Record<string, AdvisorContext> = {
  watch: {
    rec: "You are tracking 71 sources across 5 categories. Three blind spots surfaced this week: no podcast coverage of AI governance, no Substack writers in the executive development space, and zero coverage of the \"fractional executive\" movement which is adjacent to your positioning.",
    cards: [
      { role: "Positioning", text: "Craig Mod and Cal Newport are your only tracked competitors. Both are productivity writers. Consider adding someone writing specifically about executive communication, that is your actual lane." },
      { role: "Coverage Gaps", text: "Your keyword cluster skews toward AI and coaching. No one in your sources is covering the intersection of both. That gap is yours to own, and nobody is watching it yet." },
      { role: "Signals", text: "Three thought leaders you follow went quiet this week simultaneously. That pattern sometimes precedes a major publication. Worth watching if something drops in the next 72 hours." },
    ],
  },
  work: {
    rec: "Three advisors flag the close as the weakest element. The argument earns agreement, but agreement is not action. The piece needs one sharper sentence before it ends. Everything else holds.",
    cards: [
      { role: "Strategy", text: "The infrastructure framing is ownable. Competitors are writing about time management, you are writing about systems. Stay there. Do not soften the diagnosis in the close." },
      { role: "Conversion", text: "The reader needs one more concrete image of what infrastructure looks like. A single sharp example closes the gap between interest and action." },
      { role: "Sales", text: "A skeptic finishes this piece nodding, but not moving. The close is directional, not decisive. Consider whether the last sentence should point somewhere specific." },
    ],
  },
  wrap: {
    rec: "Before you wrap, consider the distribution sequence. LinkedIn post first builds momentum. Newsletter 48 hours later catches the second wave. Podcast last, it has the longest shelf life.",
    cards: [
      { role: "Timing", text: "Saturday morning posts on LinkedIn get 40% lower engagement than Tuesday–Thursday. If you are wrapping now, consider scheduling LinkedIn for Tuesday." },
      { role: "Sequencing", text: "Your Sunday Story should go out Sunday. The LinkedIn post should tease it Friday. That sequence has driven the highest newsletter open rates in your category." },
      { role: "Audience", text: "The podcast script reads well but opens cold. Podcast listeners need a warmer entry, one personal sentence before the hook lands." },
    ],
  },
};

function getAdvisorCtx(pathname: string): { ctx: AdvisorContext; stageLabel: string } {
  if (pathname.includes("/watch")) return { ctx: ADVISOR_CONTENT.watch, stageLabel: "Watch" };
  if (pathname.includes("/wrap")) return { ctx: ADVISOR_CONTENT.wrap, stageLabel: "Wrap" };
  const raw = window.__ewWorkStage || "Work";
  const stageLabel = raw === "Edit" ? "Draft" : raw;
  return { ctx: ADVISOR_CONTENT.work, stageLabel };
}

function InspectorEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const,
      color: "var(--fg-3)", marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function InspectorDivider() {
  return <div style={{ height: 1, background: "var(--glass-border)", margin: "14px 0" }} aria-hidden />;
}

function AdvisorFeedbackFallback({ pathname }: { pathname: string }) {
  const { ctx, stageLabel } = getAdvisorCtx(pathname);
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8 }}>{stageLabel}</div>
      <div style={{
        border: "1px solid rgba(74,144,217,0.16)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "rgba(74,144,217,0.04)",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const,
          color: "var(--blue, #4A90D9)", marginBottom: 6,
        }}>
          Consensus
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>{ctx.rec}</div>
      </div>
      {ctx.cards.map((card, i) => (
        <div
          key={i}
          style={{
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-card)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>{card.role}</div>
          <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5 }}>{card.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOVER DATA, full 17-item grid matching wireframe v7.23
// ─────────────────────────────────────────────────────────────────────────────

interface DiscoverItem {
  id: string;
  color: string;
  icon: string;
  name: string;
  desc: string;
  rationale: string;
  detail: string;
  launchLabel: string;
  route: string | null;
}

const DISCOVER_ITEMS: DiscoverItem[] = [
  {
    id: "reed", color: "#6B8FD4", icon: "✦", name: "Reed",
    desc: "Interview and excavate your thinking.",
    rationale: "Your thinking partner before the blank page.",
    detail: "Reed runs in the Intake stage of Work. It opens as a conversation, not a form.\n\nYou talk. Reed listens and asks questions, pushing deeper, surfacing the specifics, finding the angles you did not know were there. When the session is done, Reed hands off a structured brief to Outline.\n\nHow to use it: Go to Work and start typing or speaking. You do not need to know what you want to write. Start with what is on your mind and Reed will help you find the shape of the idea.\n\nThe output is yours because the input was yours. Reed does not invent, it excavates.",
    launchLabel: "Open Intake", route: "/studio/work",
  },
  {
    id: "voicedna", color: "#D4A832", icon: "◆", name: "Voice DNA",
    desc: "Capture your voice signature.",
    rationale: "Three layers + subconscious markers.",
    detail: "Voice DNA lives in Preferences. It is the foundation that every session builds on.\n\nIt captures your communication signature across three layers:\n\nVoice Markers, sentence structure, rhythm, pacing. How you move through an argument.\n\nValue Markers, what you believe and stand for. The positions you hold without being asked.\n\nPersonality Markers, how you show up. Warmth, edge, humor, gravity.\n\nThere is also a fourth layer, subconscious patterns that most people cannot see in their own writing: pronoun habits, sentence openings, conjunction use, linguistic variance.\n\nRun it once to set your baseline. The system updates it over time.",
    launchLabel: "Go to Preferences", route: "/studio/settings/voice",
  },
  {
    id: "impact-score", color: "#4CAF82", icon: "⊕", name: "Impact Score",
    desc: "Score your draft before publishing.",
    rationale: "900/1000 is the publication-ready threshold.",
    detail: "Draft Score runs automatically in the Review stage. You do not invoke it manually, it is always running in the background as you edit.\n\nThe score is out of 1,000. Publication-ready threshold is 900.\n\nBelow 900, the system tells you exactly what is weak and routes the problem to the right stage. A voice issue sends you back to Edit. A factual flag surfaces in the draft. A structure problem points back to Outline.\n\nThe score is not a grade. It is a map. 900 means the piece is ready. Under 900 means there is something specific left to fix.",
    launchLabel: "Go to Review", route: "/studio/work",
  },
  {
    id: "watch", color: "#0D1B2A", icon: "◉", name: "Watch",
    desc: "Your overnight market intelligence briefing.",
    rationale: "Ranked signals, ready when you arrive.",
    detail: "Watch is your intelligence briefing. It runs overnight and is ready when you open Studio in the morning.\n\nIt scans your market, tracks competitor activity, and surfaces the opportunities most relevant to your positioning, ranked in order of relevance. What appears first matters most right now.\n\nWatch pulls from the sources and topics you have configured in your Watch settings. The more context you give it, the more precise the briefing becomes.\n\nEach signal includes a suggested action: use it in Work, note it in the Pipeline, or dismiss it. Nothing sits unread for long.",
    launchLabel: "Go to Watch", route: "/studio/watch",
  },
  {
    id: "work", color: "#6B8FD4", icon: "✎", name: "Work",
    desc: "Where ideas become drafts.",
    rationale: "Five stages: Intake, Outline, Edit, Review, Export.",
    detail: "Work is where ideas become drafts. It moves in five stages:\n\nIntake, You talk, Reed listens. The idea gets excavated and shaped.\n\nOutline, The structure gets built. You choose the angle, the format, the arc.\n\nEdit, The draft appears. You write, refine, and resolve flags. Voice match runs in real time.\n\nReview, The draft is read by an adversarial reader. Flags surface. Score runs.\n\nExport, The final draft is saved to your session and sent to Wrap.",
    launchLabel: "Go to Work", route: "/studio/work",
  },
  {
    id: "wrap", color: "#C49A20", icon: "□", name: "Wrap",
    desc: "Turn drafts into deliverables.",
    rationale: "Choose a format, pick a template, publish.",
    detail: "Wrap is where drafts become deliverables. You choose a format, pick a template, and the system produces the final output, formatted, styled, and ready to publish or send.\n\nTemplates include: LinkedIn Post, Newsletter, Podcast Script, Sunday Story, Executive Brief, One-Pager, and The Edition (full package).\n\nYou can add and edit templates from the Wrap dashboard. Every template can be customized for your brand and your typical use cases.\n\nWrap always saves to your session files. Download, copy to clipboard, or send directly from here.",
    launchLabel: "Go to Wrap", route: "/studio/wrap",
  },
  {
    id: "branddna", color: "#E8834A", icon: "⊞", name: "Brand DNA",
    desc: "Extract your brand from any source.",
    rationale: "URL, PDF, or uploaded brand guide.",
    detail: "Brand DNA is set up in Project Files. You give it a URL, a PDF, or an uploaded brand guide and it extracts your complete brand profile.\n\nThat profile feeds into everything the system produces for your project: the voice calibration, the format choices, the templates, the review criteria.\n\nWhen Brand DNA is present, every output is calibrated to your brand. When it is absent, the system is working without that context.\n\nSet it up once when you start a new project. Update it when the brand changes. You will feel the difference immediately.",
    launchLabel: "Go to Project Files", route: "/studio/resources",
  },
  {
    id: "execbrief", color: "#9B72D4", icon: "◇", name: "Executive Brief",
    desc: "Wrap any session into a branded brief.",
    rationale: "Decision system. 25% filter. 3 sections max.",
    detail: "Executive Brief is a template option in Wrap. Once you have an exported draft, you can wrap it as an Executive Brief instead of a standard post or newsletter.\n\nThe Brief format applies a strict filter: only the most essential information survives. Three sections maximum. Every sentence earns its place.\n\nIt is designed for the person who needs to act on information, not read through it. Use it for stakeholder deliverables, client summaries, or any context where the reader has 90 seconds and needs to leave with clarity.\n\nSelect it from the template list in Wrap after you have finished Work.",
    launchLabel: "Go to Wrap", route: "/studio/wrap",
  },
  {
    id: "edition", color: "#C49A20", icon: "✦", name: "The Edition",
    desc: "Full publication package from one draft.",
    rationale: "Every format out from one approved draft.",
    detail: "The Edition is a Wrap template that produces your complete publication package from a single approved draft.\n\nOne draft in. Every format out, LinkedIn post, newsletter, podcast script, Sunday Story, show notes, image prompts, and more.\n\nEach format is adapted to its channel, not just reformatted, but rewritten for the platform and the reader who lives there. A LinkedIn post reads like LinkedIn. A podcast script sounds like audio.\n\nSelect The Edition from the template list in Wrap. It runs after you have completed Work and exported your draft.",
    launchLabel: "Go to Wrap", route: "/studio/wrap",
  },
  {
    id: "catalog", color: "#64748B", icon: "▣", name: "The Catalog",
    desc: "Your completed session archive.",
    rationale: "Every session, all its files, sorted by date.",
    detail: "The Catalog is your session archive. Every Work session you complete is saved here automatically, with all its exported files.\n\nClick any session to see its files, reopen it in Work, or rename it. Sessions are sorted by date, most recent first.\n\nThe Catalog is read-only during active sessions. When you are done with Work and Wrap, your session appears here.",
    launchLabel: "Go to Catalog", route: "/studio/outputs",
  },
  {
    id: "pipeline", color: "#4A90D9", icon: "◌", name: "The Pipeline",
    desc: "Ideas and signals waiting for the right moment.",
    rationale: "Parked ideas and watched signals.",
    detail: "The Pipeline is your idea holding area. Two types of items live here:\n\nSignals, things Watch surfaced that you are not ready to act on yet but do not want to lose.\n\nParked ideas, topics you want to write about when the timing is right, when a dependency resolves, or when you have the research you need.\n\nPipeline items surface on your Home screen when conditions suggest the timing is right. You can activate any item directly into a new Work session.",
    launchLabel: "Go to Pipeline", route: "/studio/lot",
  },
  {
    id: "files", color: "#E8834A", icon: "▤", name: "Project Files",
    desc: "Your project context library.",
    rationale: "Brand DNA, Voice DNA, reference docs.",
    detail: "Project Files is your project context library. Files here are available to every Work session in this project.\n\nCommon files: Brand DNA, Voice DNA, reference documents, client guidelines, research.\n\nYou can upload files, view them, replace them, or remove them from the project. Files uploaded during a session are session-only unless you move them here.",
    launchLabel: "Go to Project Files", route: "/studio/resources",
  },
  {
    id: "prefs", color: "#64748B", icon: "⚙", name: "Preferences",
    desc: "Configure how Studio works for you.",
    rationale: "Watch sources, Voice DNA, default formats.",
    detail: "Preferences is where you configure how Studio works for you.\n\nSet up Voice DNA to capture your communication signature. Configure Watch sources, which publications, people, and topics you want tracked. Set your default output formats and platform preferences.\n\nPreferences apply to every session in this project. Change them any time from the rail.",
    launchLabel: "Go to Preferences", route: "/studio/settings",
  },
  {
    id: "advisors", color: "#4A90D9", icon: "☻", name: "Advisors",
    desc: "Strategic guidance at every stage.",
    rationale: "Available in Watch, Work, and Wrap.",
    detail: "Advisors is a panel of strategic perspectives available at every stage of Watch, Work, and Wrap.\n\nWhen you open Advisors, you get a synthesized recommendation based on your current stage and content, plus individual perspectives from different strategic lenses: positioning, audience, timing, conversion, and more.\n\nEach card shows a specific observation and lets you agree or skip. \"Apply recommendations\" pushes accepted advice into your current stage.\n\nAdvisors is not available in Catalog, Pipeline, Project Files, or Preferences, it only activates where there is active content to advise on.",
    launchLabel: "Open Advisors", route: null,
  },
  {
    id: "dashboard", color: "#64748B", icon: "◼", name: "Dashboard",
    desc: "Context panel for your current stage.",
    rationale: "Templates, outputs, files, and actions.",
    detail: "The Dashboard is the context panel on the right side of every screen. It shows information and actions relevant to whatever stage you are in.\n\nIn Intake: output format selection, templates, session files, project files.\nIn Edit: voice match score, flag counts, word count, output queue.\nIn Review: improvement cards, per-format scores, export controls.\nIn Wrap: source file, template selection, export options.\nIn Watch: sources being tracked, topic configuration.\n\nTap the Reed launcher on the right edge to open or close it. It stays closed until you open it; page content keeps updating in the background.",
    launchLabel: "Toggle Dashboard", route: null,
  },
  {
    id: "project", color: "#0D1B2A", icon: "◇", name: "What is a Project?",
    desc: "One client or one voice. A container.",
    rationale: "Projects hold files, settings, and sessions.",
    detail: "A Project is a container for one client, one voice, or one publishing identity.\n\nEverything inside a project shares the same context: the Brand DNA, the Voice DNA, the Project Files, the Watch configuration, and the Preferences.\n\nWhen you switch projects from the project menu in the top bar, Studio switches to that context. Different templates, different voice calibration, different tracked sources.\n\nExamples of projects: a coaching client, your personal brand, a company you consult for, a podcast you produce.\n\nSessions, the Catalog, and the Pipeline all live inside a project. They do not cross project lines.",
    launchLabel: "Got it", route: null,
  },
  {
    id: "session", color: "#6B8FD4", icon: "✎", name: "What is a Session?",
    desc: "One idea, worked all the way through.",
    rationale: "A session is one run through Watch, Work, Wrap.",
    detail: "A Session is one idea worked all the way through, from Intake to Export.\n\nEvery time you start something new in Work, you are starting a session. When you finish and export, the session is saved to the Catalog with all its output files.\n\nSessions are not drafts. A draft is what lives in Edit. A session is the complete record: what you brought in, what Reed surfaced, what you wrote, what you exported, and what formats you produced.\n\nYou can resume a session any time from the Start screen or from the Catalog. Sessions do not expire. Everything you produced is there.",
    launchLabel: "Start a session", route: "/studio/work",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SHELL
// ─────────────────────────────────────────────────────────────────────────────

export default function StudioShell() {
  const isMobile = useMobile();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [dashContent, setDashContent] = useState<React.ReactNode | null>(null);
  const [feedbackContent, setFeedbackContent] = useState<React.ReactNode | null>(null);
  const [reedPrefill, setReedPrefill] = useState("");
  const [reedChipRequest, setReedChipRequest] = useState<{ id: number; text: string; label?: string } | null>(null);
  const [reedThread, setReedThread] = useState<Array<{ type: "user" | "reed" | "note"; text: string; from?: string; to?: string }>>([]);
  const [proposalPending, setProposalPending] = useState(false);
  const [intakeProgress, setIntakeProgress] = useState<{ questionCount: number; ready: boolean }>({ questionCount: 0, ready: false });
  const [intakeAdvance, setIntakeAdvance] = useState<(() => void) | null>(null);

  const studioGlassDense =
    location.pathname.startsWith("/studio/outputs") ||
    location.pathname.startsWith("/studio/resources") ||
    location.pathname.startsWith("/studio/wrap") ||
    location.pathname.startsWith("/studio/watch") ||
    location.pathname.startsWith("/studio/admin") ||
    location.pathname.startsWith("/studio/lot");

  const studioViewportLock = location.pathname.startsWith("/studio/work");

  return (
    <ShellContext.Provider value={{
      searchOpen, setSearchOpen,
      dashOpen, setDashOpen,
      discoverOpen, setDiscoverOpen,
      dashContent, setDashContent,
      feedbackContent, setFeedbackContent,
      reedPrefill, setReedPrefill,
      reedChipRequest, setReedChipRequest,
      reedThread, setReedThread,
      proposalPending, setProposalPending,
      intakeProgress, setIntakeProgress,
      intakeAdvance, setIntakeAdvance,
    }}>
      <ProjectProvider>
      <div
        className={`studio-app-shell ${studioViewportLock ? "studio-app-shell--viewport-lock" : "studio-app-shell--document-scroll"}`}
        style={{
          background: "var(--bg)", fontFamily: "var(--font)",
          width: "100%",
        }}
      >
        <StudioGlobalSearch />

        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 39 }} />
        )}

        {/* Left Rail */}
        <div
          className={isMobile ? undefined : "studio-app-sidebar-wrap"}
          style={
          isMobile
            ? { position: "fixed", top: 0, left: 0, bottom: 0, width: 220, transform: sidebarOpen ? "translate3d(0,0,0)" : "translate3d(-100%,0,0)", transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)", zIndex: 40 }
            : { position: "relative", width: sidebarCollapsed ? 52 : 220, flexShrink: 0, zIndex: 1, transition: "width 0.18s ease" }
        }
        >
          <StudioSidebar
            collapsed={!isMobile && sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
            onMobileClose={isMobile ? () => setSidebarOpen(false) : undefined}
          />
        </div>

        {/* Main column */}
        <div className="studio-app-main-column" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top bar */}
          {isMobile ? (
            <div className="liquid-glass" style={{ height: 48, borderRadius: 0, borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0 }}>
              <button type="button" onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Open navigation">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
              <Logo size="sm" />
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  title="Search"
                  aria-label="Open search"
                  style={{
                    background: "none", border: "none", borderRadius: 8, padding: 6, cursor: "pointer",
                    color: "var(--fg-3)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                <NotificationBell />
              </div>
            </div>
          ) : (
            <StudioTopBar />
          )}

          {/* Main canvas (Reed / dashboard is a floating glass flyout) */}
          <div className="studio-stage-canvas" style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 0%", overflow: "hidden" }}>
            <main
              className={`studio-main-inner studio-stage-scroll studio-content-substrate${studioGlassDense ? " studio-glass-dense" : ""}`}
              style={{
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                paddingBottom: isMobile ? 80 : 0, position: "relative",
                borderRadius: "12px 0 0 0",
              }}
            >
              <Outlet />
            </main>
          </div>
        </div>

        {discoverOpen && (
          <DiscoverOverlay
            onClose={() => setDiscoverOpen(false)}
            pathname={location.pathname}
          />
        )}

        {isMobile && <MobileBottomNav />}

        <FloatingReedPanel isMobile={isMobile} open={dashOpen} setOpen={setDashOpen} />
      </div>
      </ProjectProvider>
    </ShellContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING REED / DASHBOARD (liquid glass flyout + edge launcher)
// ─────────────────────────────────────────────────────────────────────────────

function FloatingReedPanel({ isMobile, open, setOpen }: { isMobile: boolean; open: boolean; setOpen: (v: boolean) => void }) {
  const { feedbackContent, dashContent } = useShell();
  const location = useLocation();
  const pathname = location.pathname;
  const feedbackBody = feedbackContent ?? dashContent;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {!open && (
        <button
          type="button"
          className={`liquid-glass-pill studio-reed-launcher ${isMobile ? "studio-reed-launcher-mobile" : "studio-reed-launcher-desktop"}`}
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="studio-reed-flyout"
          aria-label="Open inspector panel"
          style={{ color: "var(--fg-2)" }}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
            <path d="M1 1.5h16M1 7h16M1 12.5h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <aside
        id="studio-reed-flyout"
        className={`liquid-glass-card studio-reed-flyout ${open ? "is-open" : ""} ${isMobile ? "studio-reed-flyout-mobile" : ""}`}
        aria-hidden={!open}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(255,255,255,0.42)", flexShrink: 0,
          padding: "10px 12px",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", letterSpacing: "0.01em" }}>Inspector</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close inspector panel"
            style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.5)", color: "var(--fg-3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              fontFamily: "var(--font)", transition: "background 0.12s, color 0.12s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.color = "var(--fg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; e.currentTarget.style.color = "var(--fg-3)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
        >
          <div
            className="studio-advisor-scroll"
            style={{
              flex: "0 1 auto",
              maxHeight: "50%",
              minHeight: 0,
              overflowY: "auto",
              padding: "12px 12px 8px",
            }}
          >
            <InspectorEyebrow>Feedback</InspectorEyebrow>
            <div style={{ marginBottom: 2 }}>
              {feedbackBody ?? <AdvisorFeedbackFallback pathname={pathname} />}
            </div>
            <InspectorDivider />
          </div>
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            padding: "10px 12px 8px",
            borderTop: "1px solid var(--glass-border)",
          }}
          >
            <InspectorEyebrow>Ask Reed</InspectorEyebrow>
            <ReedPanel />
          </div>
        </div>

        <div style={{
          padding: "8px 14px",
          fontSize: 9, color: "var(--fg-3)",
          textAlign: "center" as const,
          flexShrink: 0,
          borderTop: "1px solid rgba(0,0,0,0.05)",
        }}>
          &copy; 2026 Mixed Grill, LLC
        </div>
      </aside>
    </>
  );
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function ReedPanel() {
  const { reedThread, setReedThread, reedPrefill, setReedPrefill, setReedChipRequest, proposalPending, intakeProgress, intakeAdvance } = useShell();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workStage = useWorkStageFromShell();
  const stageKey = location.pathname.includes("/studio/watch")
    ? "Watch"
    : location.pathname.includes("/studio/wrap")
      ? "Wrap"
      : workStage;
  // CO_031: Dynamic Intake chips based on progress
  const stageChips = stageKey === "Intake"
    ? (intakeProgress.ready || intakeProgress.questionCount >= 5)
      ? [{ label: "Ready to make an outline", prefill: "" }]
      : intakeProgress.questionCount === 0
        ? [{ label: "What are we working on?", prefill: "What are we working on?" }]
        : [{ label: "Continue the conversation", prefill: "" }]
    : REED_STAGE_CHIPS[stageKey] || REED_STAGE_CHIPS.Review;

  const prefillAndFocus = useCallback((text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const runChip = useCallback((text: string, label?: string) => {
    // CO_031: "Ready to make an outline" chip calls handleBuildOutline directly
    if (label === "Ready to make an outline" && intakeAdvance) {
      intakeAdvance();
      return;
    }
    // CO_031: "Continue the conversation" chip focuses the main input
    if (label === "Continue the conversation") {
      inputRef.current?.focus();
      return;
    }
    if (stageKey === "Edit") {
      setReedChipRequest({ id: Date.now(), text, label });
      return;
    }
    prefillAndFocus(text);
  }, [prefillAndFocus, setReedChipRequest, stageKey]);

  // Same path as stage chips: external pages call setReedPrefill; we only fill the one composer.
  useEffect(() => {
    const t = (reedPrefill || "").trim();
    if (!t) return;
    setReedPrefill("");
    prefillAndFocus(t);
  }, [reedPrefill, setReedPrefill, prefillAndFocus]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reedThread.length, sending]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const message = input.trim();
    setInput("");

    // Add user message to thread
    setReedThread(prev => [...prev, { type: "user", text: message }]);
    setSending(true);

    try {
      // Build session context from WorkSession bridge (CO_020)
      const ctx = window.__ewAskReedContext;
      const sessionSummary = ctx
        ? `[ASK REED PANEL — side conversation, not the main intake flow]\n\nCurrent stage: ${ctx.stage}\nOutput type: ${ctx.outputType}${ctx.draft ? `\nDraft word count: ${ctx.draft.split(/\s+/).length}` : ""}\n\nMain session conversation so far:\n${ctx.conversationSummary}${ctx.draft ? `\n\n---\nCurrent draft (first 2000 chars):\n${ctx.draft.slice(0, 2000)}` : ""}`
        : "[ASK REED PANEL — side conversation]\n\nNo active session context available.";

      // Build Ask Reed thread as the conversation messages.
      // First message is the session context, then the Ask Reed exchanges.
      const currentThread = [...reedThread, { type: "user" as const, text: message }];
      const askReedMessages: Array<{ role: string; content: string }> = [
        { role: "user", content: sessionSummary },
        { role: "assistant", content: "Understood. I have full context of the active session. What do you need?" },
      ];
      for (const m of currentThread) {
        if (m.type === "user") {
          askReedMessages.push({ role: "user", content: m.text });
        } else if (m.type === "reed") {
          askReedMessages.push({ role: "assistant", content: m.text });
        }
      }

      const res = await fetchWithRetry(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: askReedMessages,
          outputType: ctx?.outputType || "freestyle",
          voiceDnaMd: ctx?.voiceDnaMd || "",
          userId: ctx?.userId,
          userName: ctx?.userName,
          systemMode: "CONTENT_PRODUCTION",
        }),
      }, { timeout: 30000 });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const reply = (data.reply ?? "").replace(/\u2014/g, ",").replace(/\u2013/g, ",");

      setReedThread(prev => [...prev, { type: "reed", text: reply || "No response received." }]);
    } catch {
      setReedThread(prev => [...prev, { type: "reed", text: "Reed couldn't respond. Try again." }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, reedThread, setReedThread]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
      {stageChips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, flexShrink: 0 }}>
          {stageChips.map((chip, ci) => {
            const disabled = proposalPending && stageKey === "Edit";
            return (
              <button
                key={ci}
                type="button"
                onClick={() => { if (!disabled) runChip(chip.prefill, chip.label); }}
                disabled={disabled}
                style={{
                  fontSize: 10, padding: "4px 10px", borderRadius: 99,
                  background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)",
                  color: "var(--fg-2)", cursor: disabled ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: disabled ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 8, minHeight: 0, width: "100%" }}>
        {reedThread.map((m, i) => {
          if (m.type === "note") {
            return (
              <div key={i} style={{
                marginBottom: 8, padding: "8px 10px",
                borderLeft: "2px solid #F5C642",
                background: "rgba(245,198,66,0.06)",
                borderRadius: "0 6px 6px 0",
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: "#F5C642",
                  letterSpacing: "0.06em", marginBottom: 3,
                  textTransform: "uppercase" as const,
                }}>
                  CARRIED FROM {m.from?.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6, marginBottom: 6 }}>{m.text}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => prefillAndFocus(`Let's work on this now: ${m.text}`)} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, background: "rgba(255,255,255,0.92)", color: "#0D1B2A", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Work on this now</button>
                  <button type="button" onClick={() => prefillAndFocus(`Apply this to the current ${stageKey} context: ${m.text}`)} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, background: "rgba(255,255,255,0.92)", color: "#0D1B2A", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Apply to {stageKey}</button>
                  <button type="button" onClick={() => prefillAndFocus("Set this aside for now. Flag it for Review.")} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, background: "rgba(255,255,255,0.92)", color: "#0D1B2A", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Set aside</button>
                </div>
              </div>
            );
          }
          if (m.type === "reed") {
            return (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  flexShrink: 0, width: 24, paddingTop: 1,
                }}>
                  <ReedProfileIcon size={18} title="Reed" />
                </div>
                <div style={{
                  background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)",
                  borderRadius: "0 8px 8px 8px", padding: "8px 10px",
                  fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6, maxWidth: "85%",
                }}>{m.text}</div>
              </div>
            );
          }
          // User message
          return (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <div style={{
                background: "rgba(245,198,66,0.1)", border: "1px solid rgba(245,198,66,0.2)",
                borderRadius: "8px 0 8px 8px", padding: "8px 10px",
                fontSize: 11, color: "var(--fg)", lineHeight: 1.6, maxWidth: "85%",
              }}>{m.text}</div>
            </div>
          );
        })}
        {sending && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "center",
              flexShrink: 0, width: 24, paddingTop: 1,
            }}>
              <ReedProfileIcon size={18} title="Reed" />
            </div>
            <div style={{
              background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)",
              borderRadius: "0 8px 8px 8px", padding: "8px 10px",
              fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6, fontStyle: "italic",
            }}>Reed is thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.03)",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        padding: "8px 10px",
        flexShrink: 0,
        opacity: sending ? 0.5 : 1,
      }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask Reed..."
          aria-label="Ask Reed"
          disabled={sending}
          style={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12,
            color: "var(--fg)",
            fontFamily: "var(--font)",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Send message to Reed"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: input.trim() ? "var(--fg)" : "rgba(0,0,0,0.06)",
            border: "none",
            cursor: input.trim() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          <svg style={{ width: 11, height: 11, stroke: input.trim() ? "#F5F3EF" : "var(--fg-3)", strokeWidth: 2.5, fill: "none" }} viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOVER OVERLAY, list view + detail view with back button
// ─────────────────────────────────────────────────────────────────────────────

function DiscoverOverlay({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [detailItem, setDetailItem] = useState<DiscoverItem | null>(null);

  const filtered = DISCOVER_ITEMS.filter(d =>
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.desc.toLowerCase().includes(q.toLowerCase()) ||
    d.rationale.toLowerCase().includes(q.toLowerCase())
  );

  const handleLaunch = (item: DiscoverItem) => {
    onClose();
    if (item.route) nav(item.route);
  };

  const formatDetail = (text: string) =>
    text.split("\n\n").map((para, i) => (
      <p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.75, marginBottom: 12 }}>
        {para.split("\n").map((line, j) => (
          <span key={j}>
            {line}
            {j < para.split("\n").length - 1 && <br />}
          </span>
        ))}
      </p>
    ));

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(13,27,42,0.55)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(20, 30, 48, 0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          width: 680, maxHeight: 560, overflowY: "auto", padding: "22px 24px",
          boxShadow: "0 16px 64px rgba(0,0,0,0.35)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* ── Detail view ── */}
        {detailItem ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <button
                onClick={() => setDetailItem(null)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(255,255,255,0.66)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", padding: 0 }}
              >
                <svg style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                All tools
              </button>
              <button onClick={onClose} aria-label="Close panel" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.66)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            {/* Detail header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: `${detailItem.color}18`, color: detailItem.color, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {detailItem.icon}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 2 }}>{detailItem.name}</div>
                <div style={{ width: 32, height: 3, background: detailItem.color, borderRadius: 2 }} />
              </div>
            </div>

            {/* Detail body */}
            <div style={{ marginBottom: 22 }}>
              {formatDetail(detailItem.detail)}
            </div>

            {/* Launch button */}
            <button
              onClick={() => handleLaunch(detailItem)}
              style={{
                padding: "10px 20px", borderRadius: 6,
                background: detailItem.color, border: "none",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              {detailItem.launchLabel}
            </button>
          </>
        ) : (
          /* ── List view ── */
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "0.01em" }}>Discover</div>
              <button onClick={onClose} aria-label="Close panel" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.66)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search tools..."
              autoFocus
              style={{
                width: "100%", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
                padding: "10px 14px", fontSize: 13, fontFamily: "var(--font)",
                outline: "none", marginBottom: 16, color: "rgba(255,255,255,0.92)", background: "rgba(255,255,255,0.03)",
                transition: "border-color 0.12s",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(74,144,217,0.5)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => setDetailItem(item)}
                  style={{
                    padding: 14, border: "1px solid rgba(255,255,255,0.06)",
                    borderTop: `3px solid ${item.color}`,
                    borderRadius: 8, cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, marginBottom: 10, color: item.color }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 3 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.84)", lineHeight: 1.4, marginBottom: 5 }}>{item.desc}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.66)", fontStyle: "normal", lineHeight: 1.4 }}>{item.rationale}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
