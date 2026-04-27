import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Logo from "../Logo";
import { MarketingDemoCursor } from "./MarketingDemoCursor";

const font = { fontFamily: "var(--xp-font, 'Inter', system-ui, sans-serif)" };
const mono = { fontFamily: "var(--xp-mono, 'DM Mono', monospace)" };

const panel: React.CSSProperties = {
  background: "rgba(8, 16, 28, 0.88)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

/** Full script length including dwell at the end before the loop restarts. */
const WATCH_CYCLE_MS = 12000;
const WORK_CYCLE_MS = 15600;

function useDemoLoopProgress(loopEpoch: number, totalMs: number, reduced: boolean): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reduced) {
      setP(1);
      return;
    }
    const start = performance.now();
    let rid = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / totalMs);
      setP(t);
      if (t < 1) rid = requestAnimationFrame(tick);
    };
    rid = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rid);
  }, [loopEpoch, totalMs, reduced]);
  return reduced ? 1 : p;
}

function HiwDemoLoopChrome({
  labels,
  activeIdx,
  progress,
  reduced,
}: {
  labels: readonly [string, string, string];
  activeIdx: number;
  progress: number;
  reduced: boolean;
}) {
  const fill = reduced ? 1 : progress;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {labels.map((lab, i) => (
          <div
            key={lab}
            style={{
              textAlign: "center",
              fontSize: 9,
              ...mono,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              lineHeight: 1.25,
              color: i === activeIdx ? "var(--xp-gold)" : "rgba(255,255,255,0.34)",
              fontWeight: i === activeIdx ? 700 : 500,
            }}
          >
            {lab}
          </div>
        ))}
      </div>
      <div
        style={{
          height: 3,
          borderRadius: 99,
          background: "rgba(255,255,255,0.1)",
          marginTop: 10,
          overflow: "hidden",
        }}
        aria-hidden
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(fill * 1000) / 10}%`,
            borderRadius: 99,
            background: "rgba(200,169,110,0.55)",
            transition: reduced ? undefined : "width 0.04s linear",
          }}
        />
      </div>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function pulseClick(setClick: (v: boolean) => void) {
  setClick(true);
  window.setTimeout(() => setClick(false), 220);
}

// ── Watch: Settings → interest → Briefing → Run brief → signals → Use this ──

const WATCH_ACT_LABELS = ["Interests", "Briefing", "Hand off"] as const;

export function WatchDeepDemo({ animKey = "watch" }: { animKey?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const interestInputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const tabBriefRef = useRef<HTMLButtonElement>(null);
  const tabSettingsRef = useRef<HTMLButtonElement>(null);
  const runBriefRef = useRef<HTMLButtonElement>(null);
  const useThisRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();

  const [loopEpoch, setLoopEpoch] = useState(0);
  const [activeTab, setActiveTab] = useState<"settings" | "briefing">("settings");
  const [keyword, setKeyword] = useState("");
  const [interestAdded, setInterestAdded] = useState(false);
  const [briefingState, setBriefingState] = useState<"idle" | "loading" | "ready">("idle");
  const [phase, setPhase] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, v: false, click: false });

  const loopProgress = useDemoLoopProgress(loopEpoch, WATCH_CYCLE_MS, reduced);
  const watchActIdx = reduced ? 2 : phase <= 3 ? 0 : phase <= 8 ? 1 : 2;

  useEffect(() => {
    setActiveTab("settings");
    setKeyword("");
    setInterestAdded(false);
    setBriefingState("idle");
    setPhase(0);
    setCursor({ x: 0, y: 0, v: false, click: false });
    if (reduced) {
      setKeyword("Strategic AI leadership");
      setInterestAdded(true);
      setActiveTab("briefing");
      setBriefingState("ready");
      setPhase(99);
      return;
    }
    const timeouts: number[] = [];
    const intervals: number[] = [];
    timeouts.push(window.setTimeout(() => setPhase(1), 500));
    timeouts.push(window.setTimeout(() => {
      let i = 0;
      const s = "Strategic AI leadership";
      const id = window.setInterval(() => {
        i += 1;
        setKeyword(s.slice(0, i));
        if (i >= s.length) window.clearInterval(id);
      }, 42);
      intervals.push(id);
    }, 900));
    timeouts.push(window.setTimeout(() => setPhase(2), 2400));
    timeouts.push(window.setTimeout(() => {
      setInterestAdded(true);
      setKeyword("");
      setPhase(3);
    }, 2900));
    timeouts.push(window.setTimeout(() => setPhase(4), 3600));
    timeouts.push(window.setTimeout(() => {
      setActiveTab("briefing");
      setPhase(5);
    }, 4200));
    timeouts.push(window.setTimeout(() => setPhase(6), 5000));
    timeouts.push(window.setTimeout(() => {
      setBriefingState("loading");
      setPhase(7);
    }, 5600));
    timeouts.push(window.setTimeout(() => {
      setBriefingState("ready");
      setPhase(8);
    }, 7800));
    timeouts.push(window.setTimeout(() => setPhase(9), 8800));
    timeouts.push(window.setTimeout(() => setLoopEpoch(e => e + 1), WATCH_CYCLE_MS));
    return () => {
      timeouts.forEach(x => window.clearTimeout(x));
      intervals.forEach(x => window.clearInterval(x));
    };
  }, [animKey, reduced, loopEpoch]);

  useEffect(() => {
    if ([2, 5, 7, 9].includes(phase)) pulseClick(c => setCursor(p => ({ ...p, click: c })));
  }, [phase]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const tip = (el: HTMLElement | null, ax = 0.5, ay = 0.45) => {
      if (!el) return { x: r.width * 0.5, y: r.height * 0.4 };
      const b = el.getBoundingClientRect();
      return { x: b.left - r.left + b.width * ax, y: b.top - r.top + b.height * ay };
    };
    if (phase === 0 || phase === 99) {
      setCursor(c => ({ ...c, v: false, click: false }));
      return;
    }
    if (phase === 1) {
      const p = tip(interestInputRef.current, 0.75, 0.5);
      setCursor({ x: p.x, y: p.y, v: true, click: false });
      return;
    }
    if (phase === 2) {
      const p = tip(addBtnRef.current, 0.5, 0.5);
      setCursor({ x: p.x, y: p.y, v: true, click: false });
      return;
    }
    if (phase === 4 || phase === 5) {
      const p = tip(tabBriefRef.current, 0.5, 0.55);
      setCursor({ x: p.x, y: p.y, v: true, click: false });
      return;
    }
    if (phase === 6 || phase === 7) {
      const p = tip(runBriefRef.current, 0.5, 0.5);
      setCursor({ x: p.x, y: p.y, v: true, click: false });
      return;
    }
    if (phase === 8 || phase === 9) {
      const p = tip(useThisRef.current, 0.5, 0.5);
      setCursor({ x: p.x, y: p.y, v: briefingState === "ready", click: false });
      return;
    }
  }, [phase, activeTab, briefingState, interestAdded]);

  return (
    <div style={{ ...font, marginTop: 28 }}>
      <HiwDemoLoopChrome labels={WATCH_ACT_LABELS} activeIdx={watchActIdx} progress={loopProgress} reduced={reduced} />
      <div ref={rootRef} style={{ position: "relative", ...panel, padding: 12, minHeight: 400, maxHeight: 440 }}>
        <MarketingDemoCursor x={cursor.x} y={cursor.y} visible={cursor.v} click={cursor.click} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Logo size={14} variant="dark" />
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Watch</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {(["settings", "briefing"] as const).map(id => (
            <button
              key={id}
              ref={id === "settings" ? tabSettingsRef : tabBriefRef}
              type="button"
              onClick={() => setActiveTab(id)}
              style={{
                ...mono,
                flex: 1,
                padding: "6px 8px",
                borderRadius: 8,
                border: "none",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "default",
                background: activeTab === id ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.05)",
                color: activeTab === id ? "var(--xp-gold)" : "rgba(255,255,255,0.45)",
              }}
            >
              {id === "settings" ? "Settings" : "Briefing"}
            </button>
          ))}
        </div>

        {activeTab === "settings" ? (
          <div style={{ padding: "6px 4px" }}>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Interests</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                ref={interestInputRef}
                readOnly
                value={keyword}
                placeholder="Add a keyword…"
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <button
                ref={addBtnRef}
                type="button"
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "rgba(200,169,110,0.25)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Add
              </button>
            </div>
            {interestAdded ? (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, background: "rgba(74,144,217,0.2)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(74,144,217,0.35)" }}>
                  Strategic AI leadership
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ padding: "6px 4px" }}>
            {briefingState === "idle" ? (
              <button
                ref={runBriefRef}
                type="button"
                style={{
                  marginTop: 8,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Run brief
              </button>
            ) : null}
            {briefingState === "loading" ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "24px 8px", textAlign: "center" }}>
                Reed is ranking signals for your interests…
              </div>
            ) : null}
            {briefingState === "ready" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                <div style={{ fontSize: 10, ...mono, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Content triggers</div>
                <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", background: "rgba(0,0,0,0.2)" }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.45 }}>
                    <strong style={{ color: "#fff" }}>Enterprises name AI strategy leads</strong>
                    {", "}boards want a single accountable thread from pilot to production. Your angle: who owns the decision when models ship weekly.
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      ref={useThisRef}
                      type="button"
                      style={{
                        ...mono,
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(74,144,217,0.35)",
                        background: "rgba(74,144,217,0.12)",
                        color: "#7EB6FF",
                        cursor: "default",
                      }}
                    >
                      Use this
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.45 }}>
                  Use this hands the signal to Work as a starter prompt. You stay in control of send.
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Work: Intake → Build → Outline → Edit → Pipeline → Review → Send to Wrap ──

const WORK_STAGES = ["Intake", "Outline", "Edit", "Pipeline", "Review"] as const;

const WORK_OUTLINE_LINES = ["Opening: the accountable thread", "Middle: proof from your lane", "Close: one ask the reader can answer"];

const WORK_ACT_LABELS = ["Intake", "Draft", "Check"] as const;

export function WorkDeepDemo({ animKey = "work" }: { animKey?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buildRef = useRef<HTMLButtonElement>(null);
  const wrapBtnRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [loopEpoch, setLoopEpoch] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [outlineLines, setOutlineLines] = useState<string[]>([]);
  const [pipelineFill, setPipelineFill] = useState(0);
  const [phase, setPhase] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, v: false, click: false });

  const loopProgress = useDemoLoopProgress(loopEpoch, WORK_CYCLE_MS, reduced);
  const workActIdx = reduced ? 2 : stageIdx <= 0 ? 0 : stageIdx <= 2 ? 1 : 2;

  useEffect(() => {
    setStageIdx(0);
    setOutlineLines([]);
    setPipelineFill(0);
    setPhase(0);
    setCursor({ x: 0, y: 0, v: false, click: false });
    if (reduced) {
      setStageIdx(4);
      setOutlineLines(WORK_OUTLINE_LINES);
      setPipelineFill(1);
      setPhase(99);
      return;
    }
    const timeouts: number[] = [];
    const intervals: number[] = [];
    timeouts.push(window.setTimeout(() => setPhase(1), 600));
    timeouts.push(window.setTimeout(() => setPhase(2), 2200));
    timeouts.push(window.setTimeout(() => {
      pulseClick(c => setCursor(p => ({ ...p, click: c })));
      setPhase(3);
    }, 3200));
    timeouts.push(window.setTimeout(() => {
      setStageIdx(1);
      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        setOutlineLines(WORK_OUTLINE_LINES.slice(0, i));
        if (i >= WORK_OUTLINE_LINES.length) window.clearInterval(id);
      }, 380);
      intervals.push(id);
    }, 4000));
    timeouts.push(window.setTimeout(() => setStageIdx(2), 5600));
    timeouts.push(window.setTimeout(() => setStageIdx(3), 7200));
    timeouts.push(window.setTimeout(() => {
      let p = 0;
      const id = window.setInterval(() => {
        p += 0.14;
        setPipelineFill(Math.min(1, p));
        if (p >= 1) window.clearInterval(id);
      }, 120);
      intervals.push(id);
    }, 8200));
    timeouts.push(window.setTimeout(() => setStageIdx(4), 10200));
    timeouts.push(window.setTimeout(() => setPhase(4), 10800));
    timeouts.push(window.setTimeout(() => setPhase(5), 11800));
    timeouts.push(window.setTimeout(() => setLoopEpoch(e => e + 1), WORK_CYCLE_MS));
    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [animKey, reduced, loopEpoch]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const tip = (el: HTMLElement | null, ax = 0.5, ay = 0.5) => {
      if (!el) return { x: r.width * 0.72, y: r.height * 0.62 };
      const b = el.getBoundingClientRect();
      return { x: b.left - r.left + b.width * ax, y: b.top - r.top + b.height * ay };
    };
    if (phase === 0 || phase === 99) {
      setCursor(c => ({ ...c, v: false }));
      return;
    }
    if (phase === 1) {
      const p = tip(buildRef.current, 0.52, 0.5);
      setCursor({ x: p.x, y: p.y, v: stageIdx === 0, click: false });
      return;
    }
    if (phase === 2 || phase === 3) {
      const p = tip(buildRef.current, 0.52, 0.5);
      setCursor({ x: p.x, y: p.y, v: stageIdx === 0, click: false });
      return;
    }
    if (phase === 4 || phase === 5) {
      const p = tip(wrapBtnRef.current, 0.5, 0.5);
      setCursor({ x: p.x, y: p.y, v: stageIdx === 4, click: false });
      return;
    }
  }, [phase, stageIdx]);

  useEffect(() => {
    if (phase === 5) pulseClick(c => setCursor(p => ({ ...p, click: c })));
  }, [phase]);

  return (
    <div style={{ ...font, marginTop: 28 }}>
      <HiwDemoLoopChrome labels={WORK_ACT_LABELS} activeIdx={workActIdx} progress={loopProgress} reduced={reduced} />
      <div ref={rootRef} style={{ position: "relative", ...panel, padding: 12, minHeight: 400, maxHeight: 460 }}>
        <MarketingDemoCursor x={cursor.x} y={cursor.y} visible={cursor.v} click={cursor.click} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
          <Logo size={14} variant="dark" />
          <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Work</span>
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 10, flexWrap: "wrap" }}>
          {WORK_STAGES.map((s, i) => (
            <div
              key={s}
              style={{
                flex: "1 1 16%",
                minWidth: 0,
                textAlign: "center",
                padding: "5px 2px",
                borderRadius: 8,
                fontSize: 8,
                fontWeight: stageIdx === i ? 700 : 500,
                ...mono,
                letterSpacing: "0.03em",
                color: stageIdx === i ? "var(--xp-gold)" : "rgba(255,255,255,0.35)",
                background: stageIdx === i ? "rgba(200,169,110,0.12)" : "transparent",
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {stageIdx === 0 ? (
          <div style={{ padding: "8px 4px" }}>
            <div style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(255,255,255,0.06)", marginBottom: 8, fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.45 }}>
              <span style={{ ...mono, fontSize: 8, color: "var(--xp-gold)", display: "block", marginBottom: 4 }}>Reed</span>
              What is the single outcome you want the reader to act on?
            </div>
            <div style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(200,169,110,0.1)", marginBottom: 10, fontSize: 11, color: "#fff", lineHeight: 1.45, alignSelf: "flex-end" }}>
              <span style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>You</span>
              Credibility first. Name who owns the decision when models ship weekly.
            </div>
            <button
              ref={buildRef}
              type="button"
              style={{
                width: "100%",
                marginTop: 4,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(200,169,110,0.35)",
                background: "rgba(200,169,110,0.18)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                ...mono,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Build this
            </button>
          </div>
        ) : null}

        {stageIdx === 1 ? (
          <div style={{ padding: "10px 6px" }}>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Outline</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.88)", fontSize: 12, lineHeight: 1.55 }}>
              {outlineLines.map((line, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {stageIdx === 2 ? (
          <div style={{ padding: "10px 6px" }}>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>Edit</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.88)", lineHeight: 1.65, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, background: "rgba(0,0,0,0.2)", minHeight: 120 }}>
              Boards do not need more slides. They need one accountable owner for each release line. Name that owner in the opening paragraph, then prove the risk you already see in the field.
            </div>
          </div>
        ) : null}

        {stageIdx === 3 ? (
          <div style={{ padding: "10px 6px" }}>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pipeline</div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${Math.round(pipelineFill * 100)}%`, borderRadius: 99, background: "linear-gradient(90deg, rgba(200,169,110,0.5), rgba(74,144,217,0.45))", transition: "width 0.1s linear" }} />
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              Voice, research, SLOP, editorial, risk, Impact Score, Human Voice Test run in order. Blocking gates keep quality honest.
            </div>
          </div>
        ) : null}

        {stageIdx === 4 ? (
          <div style={{ padding: "10px 6px" }}>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Review</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginBottom: 12, lineHeight: 1.5 }}>
              Checks passed. When you are ready, send this piece to Wrap for channel-ready versions.
            </div>
            <button
              ref={wrapBtnRef}
              type="button"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 10,
                border: "none",
                background: "rgba(74,144,217,0.35)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              Send to Wrap
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Wrap: pick channels → run → adapted versions ──

const WRAP_CHANNELS = ["LinkedIn", "Email", "Executive Brief"] as const;

const WRAP_COPY_LI = "Hook on accountability. One proof point. Close with a question.";
const WRAP_COPY_EM = "Subject: Who owns the next model release\n\nName the owner in line one. Add one risk line. End with a 10-minute ask.";
const WRAP_COPY_EB = "Decision: assign a single accountable lead. Proof: one field signal. Next step: calendar the review.";

const WRAP_CYCLE_MS =
  4800 +
  Math.ceil(Math.max(WRAP_COPY_LI.length, WRAP_COPY_EM.length, WRAP_COPY_EB.length) / 2) * 28 +
  4400;

const WRAP_ACT_LABELS = ["Channels", "Adapt", "Pieces"] as const;

export function WrapDeepDemo({ animKey = "wrap" }: { animKey?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [loopEpoch, setLoopEpoch] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [phase, setPhase] = useState<"choose" | "running" | "deliver">("choose");
  const [cursor, setCursor] = useState({ x: 0, y: 0, v: false, click: false });
  const [liBody, setLiBody] = useState("");
  const [emBody, setEmBody] = useState("");
  const [ebBody, setEbBody] = useState("");

  const loopProgress = useDemoLoopProgress(loopEpoch, WRAP_CYCLE_MS, reduced);
  const wrapActIdx = reduced ? 2 : phase === "choose" ? 0 : phase === "running" ? 1 : 2;

  useEffect(() => {
    setPicked(new Set());
    setPhase("choose");
    setCursor({ x: 0, y: 0, v: false, click: false });
    setLiBody("");
    setEmBody("");
    setEbBody("");
    if (reduced) {
      setPicked(new Set(WRAP_CHANNELS));
      setPhase("deliver");
      setLiBody(WRAP_COPY_LI);
      setEmBody(WRAP_COPY_EM);
      setEbBody(WRAP_COPY_EB);
      return;
    }
    const timeouts: number[] = [];
    const intervals: number[] = [];
    timeouts.push(window.setTimeout(() => setPicked(new Set(["LinkedIn"])), 700));
    timeouts.push(window.setTimeout(() => setPicked(new Set(["LinkedIn", "Email"])), 1400));
    timeouts.push(window.setTimeout(() => setPicked(new Set(WRAP_CHANNELS)), 2100));
    timeouts.push(window.setTimeout(() => setPhase("running"), 2800));
    timeouts.push(window.setTimeout(() => {
      pulseClick(c => setCursor(p => ({ ...p, click: c })));
    }, 3000));
    timeouts.push(window.setTimeout(() => setPhase("deliver"), 4600));
    timeouts.push(window.setTimeout(() => {
      let i = 0;
      const id = window.setInterval(() => {
        i += 2;
        setLiBody(WRAP_COPY_LI.slice(0, Math.min(i, WRAP_COPY_LI.length)));
        setEmBody(WRAP_COPY_EM.slice(0, Math.min(i, WRAP_COPY_EM.length)));
        setEbBody(WRAP_COPY_EB.slice(0, Math.min(i, WRAP_COPY_EB.length)));
        if (i >= Math.max(WRAP_COPY_LI.length, WRAP_COPY_EM.length, WRAP_COPY_EB.length)) window.clearInterval(id);
      }, 28);
      intervals.push(id);
    }, 4800));
    timeouts.push(window.setTimeout(() => setLoopEpoch(e => e + 1), WRAP_CYCLE_MS));
    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [animKey, reduced, loopEpoch]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    if (phase === "running" && runRef.current) {
      const b = runRef.current.getBoundingClientRect();
      setCursor({
        x: b.left - r.left + b.width * 0.5,
        y: b.top - r.top + b.height * 0.5,
        v: true,
        click: false,
      });
      return;
    }
    if (phase === "choose") {
      setCursor(c => ({ ...c, v: false, click: false }));
    }
    if (phase === "deliver") {
      setCursor(c => ({ ...c, v: false, click: false }));
    }
  }, [phase]);

  return (
    <div style={{ ...font, marginTop: 28 }}>
      <HiwDemoLoopChrome labels={WRAP_ACT_LABELS} activeIdx={wrapActIdx} progress={loopProgress} reduced={reduced} />
      <div ref={rootRef} style={{ position: "relative", ...panel, padding: 12, minHeight: 400, maxHeight: 480 }}>
        <MarketingDemoCursor x={cursor.x} y={cursor.y} visible={cursor.v} click={cursor.click} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
          <Logo size={14} variant="dark" />
          <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Wrap</span>
        </div>

        {phase === "choose" ? (
          <div>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.38)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Channels</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {WRAP_CHANNELS.map(ch => {
                const on = picked.has(ch);
                return (
                  <div
                    key={ch}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: on ? "1px solid rgba(200,169,110,0.35)" : "1px solid rgba(255,255,255,0.08)",
                      background: on ? "rgba(200,169,110,0.08)" : "rgba(0,0,0,0.15)",
                      fontSize: 12,
                      color: on ? "#fff" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <span>{ch}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: on ? "var(--xp-gold)" : "rgba(255,255,255,0.25)" }}>{on ? "On" : "Off"}</span>
                  </div>
                );
              })}
            </div>
            <button
              ref={runRef}
              type="button"
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "rgba(200,169,110,0.22)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                ...mono,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Run Wrap
            </button>
          </div>
        ) : null}

        {phase === "running" ? (
          <div style={{ textAlign: "center", padding: "36px 12px", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            <div style={{ margin: "0 auto 14px", width: 26, height: 26, borderRadius: "50%", border: "2px solid rgba(245,198,66,0.35)", borderTopColor: "var(--xp-gold)", animation: "hiwWrapSpin 0.85s linear infinite" }} />
            Adapting your draft for {WRAP_CHANNELS.length} channels…
            <style>{`@keyframes hiwWrapSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : null}

        {phase === "deliver" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {[
              { label: "LinkedIn", body: liBody },
              { label: "Email", body: emBody },
              { label: "Executive Brief", body: ebBody },
            ].map(col => (
              <div key={col.label} style={{ flex: "1 1 160px", minWidth: 0, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", padding: "8px 8px", background: "rgba(0,0,0,0.2)", minHeight: 120, overflow: "hidden" }}>
                <div style={{ ...mono, fontSize: 8, color: "var(--xp-gold)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{col.label}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.82)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{col.body}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
