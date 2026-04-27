import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Logo from "../Logo";
import { EASE, EASE_SMOOTH } from "../../styles/marketing";

const TABS = ["Watch", "Work", "Wrap"] as const;

const font = { fontFamily: "var(--xp-font, 'Inter', system-ui, sans-serif)" };
const mono = { fontFamily: "var(--xp-mono, 'DM Mono', monospace)" };
const textWhite = "#FFFFFF";

/** Flat panel (toned down vs liquid glass). */
const panelSurface: React.CSSProperties = {
  background: "rgba(8, 16, 28, 0.82)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
};

export interface EverywhereDemoProps {
  stageDuration?: number;
  autoPlay?: boolean;
}

/** Pointer path starts at M5 3 in viewBox 0..24; SVG renders at 22px. Click coords are the tip. */
const CURSOR_TIP_OFFSET_X = (5 / 24) * 22;
const CURSOR_TIP_OFFSET_Y = (3 / 24) * 22;
const CURSOR_CLICK_RING = 40;

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

/** x/y are the hotspot (pointer tip) in the containing positioned box. */
function DemoCursor({ x, y, visible, click }: { x: number; y: number; visible: boolean; click?: boolean }) {
  if (!visible) return null;
  const half = CURSOR_CLICK_RING / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x - CURSOR_TIP_OFFSET_X,
        top: y - CURSOR_TIP_OFFSET_Y,
        width: 22,
        height: 22,
        pointerEvents: "none",
        zIndex: 60,
        transition: `left 0.65s ${EASE}, top 0.65s ${EASE}, transform 0.08s ease-out`,
        transform: click ? "translateY(2px)" : "translateY(0)",
      }}
      aria-hidden
    >
      {click ? (
        <span
          style={{
            position: "absolute",
            left: CURSOR_TIP_OFFSET_X - half,
            top: CURSOR_TIP_OFFSET_Y - half,
            width: CURSOR_CLICK_RING,
            height: CURSOR_CLICK_RING,
            borderRadius: "50%",
            border: "2px solid rgba(200,169,110,0.65)",
            animation: "xpEwDemoClickRing 0.38s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
          display: "block",
        }}
      >
        <path
          d="M5 3l14 10.5-5.5 1.2L10.5 21 5 3z"
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function EverywhereDemo({ stageDuration = 6800, autoPlay = true }: EverywhereDemoProps) {
  const [stage, setStage] = useState(0);
  const [fillNonce, setFillNonce] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const selectTab = (i: number) => {
    setStage(i);
    setFillNonce(n => n + 1);
  };

  const onBarEnd = useCallback(() => {
    if (!autoPlay) return;
    setStage(s => (s + 1) % 3);
    setFillNonce(n => n + 1);
  }, [autoPlay]);

  const playState: React.CSSProperties["animationPlayState"] = autoPlay ? "running" : "paused";

  const effectiveDuration = reducedMotion ? Math.min(stageDuration, 4000) : stageDuration;

  return (
    <div style={{ ...font, maxWidth: 1040, margin: "0 auto" }}>
      <style>{`
        @keyframes xpEwDemoFillBar {
          from { transform: scaleX(0.04); }
          to { transform: scaleX(1); }
        }
        @keyframes xpEwDemoRowIn {
          from { opacity: 0; transform: translate3d(0, 5px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes xpEwDemoBubble {
          from { opacity: 0; transform: translate3d(0, 5px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes xpEwDemoTile {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes xpEwDemoClickRing {
          from { transform: scale(0.28); opacity: 0.95; }
          to { transform: scale(1.05); opacity: 0; }
        }
        @keyframes xpEwDemoBriefIn {
          from { opacity: 0; transform: scale(0.96) translate3d(0, 8px, 0); }
          to { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        .xpEwDemo-fillHost {
          transform-origin: left center;
          transform: scaleX(0);
          background: rgba(200, 169, 110, 0.38);
        }
        .xpEwDemo-tabPillTrack {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding: 3px;
          border-radius: 12px;
        }
        .xpEwDemo-tabPill {
          position: absolute;
          top: 3px;
          bottom: 3px;
          width: calc((100% - 10px) / 3);
          border-radius: 9px;
          background: rgba(200, 169, 110, 0.1);
          border: 1px solid rgba(200, 169, 110, 0.18);
          transition: left 0.45s ${EASE};
          pointer-events: none;
          z-index: 0;
        }
        .xpEwDemo-tabBtn {
          position: relative;
          z-index: 1;
          border: none;
          background: none;
          cursor: pointer;
          padding: 8px 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.38);
          transition: color 0.3s ${EASE_SMOOTH};
        }
        .xpEwDemo-tabBtn-active {
          color: rgba(255, 255, 255, 0.92);
        }
        .xpEwDemo-canvasInner {
          position: relative;
          overflow: hidden;
          border-radius: 10px;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .xpEwDemo-fillHost { animation: none !important; transform: scaleX(1) !important; opacity: 0.9; }
          .xpEwDemo-tabPill { transition: none !important; }
        }
        @media (max-width: 720px) {
          .xpEwDemo-advisor { display: none !important; }
          .xpEwDemo-shell { flex-direction: column !important; }
          .xpEwDemo-nav { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>

      <div style={{ marginBottom: 14, textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(20px, 3.2vw, 28px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--xp-on-dark)",
            margin: "0 0 8px",
            lineHeight: 1.15,
          }}
        >
          Watch. Work. Wrap.
        </h2>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--xp-dim-dark)",
            maxWidth: 460,
            margin: "0 auto",
          }}
        >
          One surface. Three motions. Follow the demo to see signal, conversation, and shipped formats.
        </p>
      </div>

      <div className="xpEwDemo-tabPillTrack" style={{ ...panelSurface, marginBottom: 12 }}>
        <div
          className="xpEwDemo-tabPill"
          style={{ left: `calc(3px + ${stage} * ((100% - 10px) / 3 + 2px))` }}
        />
        {TABS.map((label, i) => {
          const active = stage === i;
          return (
            <button
              key={label}
              type="button"
              className={`xpEwDemo-tabBtn ${active ? "xpEwDemo-tabBtn-active" : ""}`}
              onClick={() => selectTab(i)}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {stage === i && autoPlay ? (
              <div
                key={`fill-${i}-${fillNonce}`}
                className="xpEwDemo-fillHost"
                onAnimationEnd={onBarEnd}
                style={{
                  position: "absolute",
                  inset: 0,
                  animation: `xpEwDemoFillBar ${effectiveDuration}ms linear forwards`,
                  animationPlayState: playState,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          isolation: "isolate",
          maxHeight: 480,
          ...panelSurface,
          borderRadius: 16,
        }}
      >
        <div style={{ padding: 12, position: "relative", zIndex: 3 }}>
          <div className="xpEwDemo-shell" style={{ display: "flex", height: 420, gap: 10, minHeight: 0 }}>
            <DemoNav stage={stage} />
            <div
              className="xpEwDemo-canvasInner"
              style={{
                flex: 1,
                minWidth: 0,
                ...panelSurface,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <StudioCanvas stage={stage} fillNonce={fillNonce} reducedMotion={reducedMotion} />
            </div>
            <AdvisorColumn />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoNav({ stage }: { stage: number }) {
  return (
    <aside
      className="xpEwDemo-nav"
      style={{
        width: 136,
        flexShrink: 0,
        ...panelSurface,
        padding: "10px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 4,
        overflow: "visible",
      }}
    >
      <div
        style={{
          padding: "2px 0 10px",
          marginBottom: 2,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          overflow: "visible",
          minHeight: 24,
        }}
      >
        <Logo size={15} variant="dark" />
      </div>
      {(["Watch", "Work", "Wrap"] as const).map((name, idx) => {
        const active = stage === idx;
        return (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 7px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: active ? 600 : 500,
              letterSpacing: "0.04em",
              color: active ? "var(--xp-gold)" : "rgba(255,255,255,0.34)",
              background: active ? "rgba(200,169,110,0.08)" : "transparent",
              border: active ? "1px solid rgba(200,169,110,0.16)" : "1px solid transparent",
              transition: `color 0.3s ${EASE}, background 0.3s ${EASE}, border-color 0.3s ${EASE}`,
            }}
          >
            {name}
          </div>
        );
      })}
    </aside>
  );
}

function StudioCanvas({ stage, fillNonce, reducedMotion }: { stage: number; fillNonce: number; reducedMotion: boolean }) {
  return (
    <div style={{ position: "relative", height: "100%", width: "100%", minHeight: 0, zIndex: 2 }}>
      {[0, 1, 2].map(s => (
        <div
          key={s}
          style={{
            opacity: stage === s ? 1 : 0,
            transform: stage === s ? "translate3d(0,0,0)" : "translate3d(0,3px,0)",
            transition: reducedMotion ? "none" : `opacity 0.35s ${EASE}, transform 0.4s ${EASE}`,
            pointerEvents: stage === s ? "auto" : "none",
            position: "absolute",
            inset: 0,
            padding: "14px 16px",
            overflow: s === 1 || s === 2 ? "auto" : "hidden",
          }}
        >
          {s === 0 ? <WatchCenter animKey={`${fillNonce}-w`} reducedMotion={reducedMotion} /> : null}
          {s === 1 ? <WorkCenter animKey={`${fillNonce}-k`} reducedMotion={reducedMotion} /> : null}
          {s === 2 ? <WrapCenter animKey={`${fillNonce}-r`} reducedMotion={reducedMotion} /> : null}
        </div>
      ))}
    </div>
  );
}

const SIGNAL_ROWS: { src: string; line: string }[] = [
  { src: "Briefing", line: "Rates steady, guidance cautious on hiring" },
  { src: "Wire", line: "Sector read: buyers waiting for proof, not promises" },
  { src: "Internal", line: "Your last memo flags delivery risk in Q3" },
  { src: "Field", line: "Customer calls repeat the same three objections" },
  { src: "Scan", line: "Competitor launched a thinner story with louder distribution" },
];

const WATCH_ROW_FIRST = 0;
const WATCH_ROW_SECOND = 1;

const WATCH_PEEK_BODY =
  "Snapshot only: rates steady, hiring language softer. Use this as a one-line cold open, not the argument.";

const WATCH_FULL_BODY = `You asked for a full briefing. Here it is.

Thesis: buyers are pausing spend until they see proof tied to outcomes they already trust. The market is not confused about the category. It is waiting for a crisp story that names the constraint, shows one credible artifact, and ends with a next step that fits a calendar, not a committee.

Audience: primary readers are VP Ops and CFO sponsors who scan for risk before they scan for upside. Secondary readers are internal champions who need language they can forward without rewriting you.

Proof plan: anchor on three signals pulled from Wire and Field. First, repeat objections from calls (same three concerns). Second, delivery risk flagged in your internal memo for Q3. Third, competitor noise that proves distribution is loud but thin on substance.

Recommended moves: open external copy with the tradeoff in sentence one. Pair every claim with a verification path: customer quote, metric, or dated milestone. Close every asset with one question that forces a reply, not a nod.

If you only do one thing next: ship a one-page decision brief that your champion can send upward unchanged. Watch stays the source of truth so the story tightens every week without you starting from zero.`;

function WatchCenter({ animKey, reducedMotion }: { animKey: string; reducedMotion: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const row0Ref = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState(0);
  const [modal, setModal] = useState<null | "peek" | "full">(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, click: false });

  useEffect(() => {
    setPhase(0);
    setModal(null);
    setCursor({ x: 0, y: 0, visible: false, click: false });
    if (reducedMotion) {
      setPhase(8);
      setModal("full");
      return;
    }
    const t0 = window.setTimeout(() => setPhase(1), 400);
    const t1 = window.setTimeout(() => setPhase(2), 1100);
    const t2 = window.setTimeout(() => {
      setPhase(3);
      setModal("peek");
    }, 2000);
    const t3 = window.setTimeout(() => setPhase(4), 2600);
    const t4 = window.setTimeout(() => setPhase(5), 3360);
    const t4b = window.setTimeout(() => setModal(null), 3650);
    const t5 = window.setTimeout(() => setPhase(6), 4100);
    const t6 = window.setTimeout(() => {
      setPhase(7);
      setModal("full");
    }, 5000);
    const t7 = window.setTimeout(() => setPhase(8), 5400);
    return () => {
      [t0, t1, t2, t3, t4, t4b, t5, t6, t7].forEach(clearTimeout);
    };
  }, [animKey, reducedMotion]);

  useEffect(() => {
    if (phase === 3 || phase === 5 || phase === 7) {
      setCursor(c => ({ ...c, click: true }));
      const t = window.setTimeout(() => setCursor(c => ({ ...c, click: false })), 220);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current.getBoundingClientRect();
    if (phase === 0) {
      setCursor(c => ({ ...c, visible: false, click: false }));
      return;
    }
    if (phase === 1) {
      const row = row0Ref.current?.getBoundingClientRect();
      if (row) {
        setCursor({
          x: row.left - wrap.left + row.width * 0.3,
          y: row.top - wrap.top + row.height * 0.52,
          visible: true,
          click: false,
        });
      } else {
        setCursor({ x: wrap.width * 0.38, y: 40, visible: true, click: false });
      }
      return;
    }
    if (phase === 2 || phase === 3) {
      const row = row0Ref.current?.getBoundingClientRect();
      if (row) {
        setCursor({
          x: row.left - wrap.left + row.width * 0.3,
          y: row.top - wrap.top + row.height * 0.52,
          visible: true,
          click: false,
        });
      }
      return;
    }
    if (phase === 4 || phase === 5) {
      const btn = closeRef.current?.getBoundingClientRect();
      if (btn && btn.width > 0) {
        setCursor({
          x: btn.left - wrap.left + btn.width * 0.5,
          y: btn.top - wrap.top + btn.height * 0.5,
          visible: true,
          click: false,
        });
      }
      return;
    }
    if (phase === 6 || phase === 7) {
      const row = row1Ref.current?.getBoundingClientRect();
      if (row) {
        setCursor({
          x: row.left - wrap.left + row.width * 0.3,
          y: row.top - wrap.top + row.height * 0.52,
          visible: true,
          click: false,
        });
      }
      return;
    }
    setCursor({ x: 0, y: 0, visible: false, click: false });
  }, [phase, modal]);

  const modalBody = modal === "peek" ? WATCH_PEEK_BODY : modal === "full" ? WATCH_FULL_BODY : "";
  const modalTitle = modal === "peek" ? "Signal" : modal === "full" ? "Briefing" : "";

  return (
    <div key={animKey} ref={wrapRef} style={{ position: "relative", height: "100%", minHeight: 0 }}>
      <DemoCursor x={cursor.x} y={cursor.y} visible={cursor.visible} click={cursor.click} />
      <div
        style={{
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {SIGNAL_ROWS.map((row, i) => {
          const isR0 = i === WATCH_ROW_FIRST;
          const isR1 = i === WATCH_ROW_SECOND;
          const rowRef = isR0 ? row0Ref : isR1 ? row1Ref : undefined;
          const rowHot =
            (isR0 && (phase === 2 || phase === 3)) || (isR1 && (phase === 6 || phase === 7)) || (isR0 && modal === "peek");
          return (
            <div key={row.line}>
              <div
                ref={rowRef}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  animation: reducedMotion ? "none" : `xpEwDemoRowIn 0.4s ${EASE} both`,
                  animationDelay: reducedMotion ? "0ms" : `${40 * i}ms`,
                  background: rowHot ? "rgba(200,169,110,0.07)" : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="xp-mono"
                    style={{
                      ...mono,
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.38)",
                      marginBottom: 4,
                    }}
                  >
                    {row.src}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: textWhite, lineHeight: 1.45 }}>{row.line}</div>
                </div>
              </div>
              {i < SIGNAL_ROWS.length - 1 ? (
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginLeft: 12, marginRight: 12 }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {modal ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            background: "rgba(2, 8, 16, 0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            animation: reducedMotion ? "none" : "xpEwDemoBriefIn 0.45s ease both",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: modal === "full" ? 400 : 340,
              maxHeight: "min(78%, 320px)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(10, 18, 30, 0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  className="xp-mono"
                  style={{
                    ...mono,
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: "var(--xp-gold)",
                    textTransform: "uppercase",
                  }}
                >
                  {modalTitle}
                </span>
                {modal === "full" ? (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Compiled from Wire, Field, and Internal</span>
                ) : null}
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.06)",
                  color: textWhite,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                padding: "12px 14px 14px",
                fontSize: 11,
                lineHeight: 1.55,
                color: textWhite,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {modal === "full" ? (
                <>
                  <span style={{ display: "block", marginBottom: 10, fontWeight: 600, color: textWhite }}>Briefing ready</span>
                  {modalBody}
                </>
              ) : (
                modalBody
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const REED_OPEN = "What is the single outcome you want a reader to act on?";
const USER_MSG_1 = "Credibility first. Plain stakes, plain ask.";
const REED_REPLY_1 =
  "Good. Lead with the tradeoff, not the footnotes. What is the one risk you want them to feel before they scroll away?";
const USER_MSG_2 = "Name the pilot risk early. Honest, not loud.";
const REED_REPLY_2 = "Right constraint. Tighten the opening, then prove the plan in one beat.";

function bubbleShellWork(side: "reed" | "you"): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "8px 11px",
    fontSize: 12,
    lineHeight: 1.45,
    color: textWhite,
    border: side === "you" ? "1px solid rgba(200,169,110,0.28)" : "1px solid rgba(255,255,255,0.1)",
    background: side === "you" ? "rgba(200,169,110,0.07)" : "rgba(255,255,255,0.05)",
  };
}

function WorkCenter({ animKey, reducedMotion }: { animKey: string; reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const buildRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");
  const [sendFlash, setSendFlash] = useState(0);
  const [bubble1, setBubble1] = useState("");
  const [bubble2, setBubble2] = useState("");
  const [reed1, setReed1] = useState("");
  const [reed2, setReed2] = useState("");
  const [showBuild, setShowBuild] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, click: false });
  const [cursorMode, setCursorMode] = useState<"hide" | "send" | "build">("hide");

  useEffect(() => {
    setTyped("");
    setSendFlash(0);
    setBubble1("");
    setBubble2("");
    setReed1("");
    setReed2("");
    setShowBuild(false);
    setCursor({ x: 0, y: 0, visible: false, click: false });
    setCursorMode("hide");
    if (reducedMotion) {
      setBubble1(USER_MSG_1);
      setReed1(REED_REPLY_1);
      setBubble2(USER_MSG_2);
      setReed2(REED_REPLY_2);
      setShowBuild(true);
      return;
    }

    const userChar = 13;
    const reedChar = 11;
    const timers: number[] = [];
    let T = 260;

    const typeString = (s: string, start: number, setter: (v: string) => void) => {
      for (let i = 1; i <= s.length; i++) {
        timers.push(window.setTimeout(() => setter(s.slice(0, i)), start + i * userChar));
      }
      return start + s.length * userChar;
    };

    const typeReed = (s: string, start: number, setter: (v: string) => void) => {
      for (let j = 1; j <= s.length; j++) {
        timers.push(window.setTimeout(() => setter(s.slice(0, j)), start + j * reedChar));
      }
      return start + s.length * reedChar;
    };

    T = typeString(USER_MSG_1, T, setTyped);
    T += 240;
    timers.push(
      window.setTimeout(() => {
        setSendFlash(1);
        setCursorMode("send");
      }, T),
    );
    T += 220;
    timers.push(
      window.setTimeout(() => {
        setBubble1(USER_MSG_1);
        setTyped("");
        setSendFlash(0);
        setCursorMode("hide");
      }, T),
    );
    T += 260;
    T = typeReed(REED_REPLY_1, T, setReed1);
    T += 320;
    T = typeString(USER_MSG_2, T, setTyped);
    T += 240;
    timers.push(
      window.setTimeout(() => {
        setSendFlash(2);
        setCursorMode("send");
      }, T),
    );
    T += 220;
    timers.push(
      window.setTimeout(() => {
        setBubble2(USER_MSG_2);
        setTyped("");
        setSendFlash(0);
        setCursorMode("hide");
      }, T),
    );
    T += 260;
    T = typeReed(REED_REPLY_2, T, setReed2);
    T += 360;
    timers.push(
      window.setTimeout(() => {
        setShowBuild(true);
      }, T),
    );
    T += 380;
    timers.push(
      window.setTimeout(() => {
        setCursorMode("build");
      }, T),
    );
    T += 520;
    timers.push(
      window.setTimeout(() => {
        setCursor(c => ({ ...c, click: true }));
      }, T),
    );
    timers.push(
      window.setTimeout(() => {
        setCursor({ x: 0, y: 0, visible: false, click: false });
        setCursorMode("hide");
      }, T + 220),
    );

    return () => timers.forEach(clearTimeout);
  }, [animKey, reducedMotion]);

  useLayoutEffect(() => {
    if (!rootRef.current || reducedMotion) return;
    const root = rootRef.current.getBoundingClientRect();
    if (cursorMode === "hide") {
      setCursor({ x: 0, y: 0, visible: false, click: false });
      return;
    }
    if (cursorMode === "send" && sendRef.current) {
      const b = sendRef.current.getBoundingClientRect();
      if (b.width > 0) {
        setCursor({
          x: b.left - root.left + b.width * 0.5,
          y: b.top - root.top + b.height * 0.5,
          visible: true,
          click: false,
        });
      }
      const t = window.setTimeout(() => setCursor(c => ({ ...c, click: true })), 120);
      const t2 = window.setTimeout(() => setCursor(c => ({ ...c, click: false })), 300);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
      };
    }
    if (cursorMode === "build" && buildRef.current) {
      const b = buildRef.current.getBoundingClientRect();
      if (b.width > 0) {
        setCursor({
          x: b.left - root.left + b.width * 0.5,
          y: b.top - root.top + b.height * 0.5,
          visible: true,
          click: false,
        });
      }
      return;
    }
  }, [cursorMode, sendFlash, showBuild, reducedMotion]);

  const sendActive = sendFlash > 0;

  return (
    <div key={animKey} ref={rootRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>
      <DemoCursor x={cursor.x} y={cursor.y} visible={cursor.visible} click={cursor.click} />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: "88%",
            animation: reducedMotion ? "none" : `xpEwDemoBubble 0.35s ${EASE} both`,
          }}
        >
          <div style={{ ...bubbleShellWork("reed") }}>
            <span style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", color: "rgba(200,169,110,0.85)", display: "block", marginBottom: 4 }}>Reed</span>
            <span style={{ color: textWhite }}>{REED_OPEN}</span>
          </div>
        </div>
        {bubble1 ? (
          <div style={{ alignSelf: "flex-end", maxWidth: "88%", animation: reducedMotion ? "none" : `xpEwDemoBubble 0.3s ${EASE} both` }}>
            <div style={{ ...bubbleShellWork("you") }}>
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>You</span>
              <span style={{ color: textWhite }}>{bubble1}</span>
            </div>
          </div>
        ) : null}
        {reed1 ? (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", animation: reducedMotion ? "none" : `xpEwDemoBubble 0.3s ${EASE} both` }}>
            <div style={{ ...bubbleShellWork("reed") }}>
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", color: "rgba(200,169,110,0.85)", display: "block", marginBottom: 4 }}>Reed</span>
              <span style={{ color: textWhite }}>{reed1}</span>
            </div>
          </div>
        ) : null}
        {bubble2 ? (
          <div style={{ alignSelf: "flex-end", maxWidth: "88%", animation: reducedMotion ? "none" : `xpEwDemoBubble 0.3s ${EASE} both` }}>
            <div style={{ ...bubbleShellWork("you") }}>
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>You</span>
              <span style={{ color: textWhite }}>{bubble2}</span>
            </div>
          </div>
        ) : null}
        {reed2 ? (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", animation: reducedMotion ? "none" : `xpEwDemoBubble 0.3s ${EASE} both` }}>
            <div style={{ ...bubbleShellWork("reed") }}>
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", color: "rgba(200,169,110,0.85)", display: "block", marginBottom: 4 }}>Reed</span>
              <span style={{ color: textWhite }}>{reed2}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {showBuild ? (
          <button
            type="button"
            ref={buildRef}
            style={{
              ...mono,
              alignSelf: "stretch",
              padding: "11px 14px",
              borderRadius: 10,
              border: "1px solid rgba(200,169,110,0.35)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "default",
              background: "rgba(200,169,110,0.18)",
              color: textWhite,
            }}
          >
            Build it
          </button>
        ) : null}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", opacity: showBuild ? 0.45 : 1 }}>
          <textarea
            readOnly
            value={typed}
            placeholder={!bubble1 ? "Type your reply…" : !bubble2 ? "Type your reply…" : ""}
            rows={2}
            style={{
              ...font,
              flex: 1,
              resize: "none",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.28)",
              color: textWhite,
              fontSize: 12,
              padding: "9px 11px",
              lineHeight: 1.4,
              outline: "none",
            }}
          />
          <button
            ref={sendRef}
            type="button"
            style={{
              ...mono,
              flexShrink: 0,
              padding: "9px 12px",
              borderRadius: 10,
              border: "none",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "default",
              background: sendActive ? "rgba(200,169,110,0.45)" : "rgba(255,255,255,0.1)",
              color: textWhite,
              transition: "background 0.15s ease",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const OUTPUT_LABELS = ["LinkedIn Post", "Essay", "Podcast", "Email", "Board Report", "Newsletter"] as const;

const WRAP_LI = `If you are selling a serious B2B change, your first job is not excitement. It is legibility.

Buyers are not confused about your category. They are tired of promises that age badly. So open with the tradeoff they already feel: speed versus certainty, cost versus coverage, autonomy versus auditability. Name it in plain language before you touch the product.

Then prove one thing. Not ten slides of pedigree. One artifact: a customer quote with a role and a date, a metric that moved for a team like theirs, or a crisp scope boundary that shows you understand what can go wrong in Q3.

Close with a question that earns a reply. Not "thoughts?" Ask what proof would change their next internal meeting. Ask what risk they need you to dismantle first. LinkedIn rewards threads that feel like a hallway conversation with an operator, not a keynote with a logo wall.

If you only remember one line: credibility is the absence of fog. Tighten until a busy VP can forward your post without rewriting you.`;

const WRAP_EMAIL = `Subject: Proof before promises: the Q3 narrative

Team,

We are going to tighten how we talk outside the building this quarter. Buyers are pausing until they see proof tied to outcomes they already trust. That means our outbound story needs three parts, always in this order.

One, lead with the tradeoff the market already believes is true. Two, attach one verification path per claim: a quote, a number, or a milestone with a date. Three, end with a single next step that fits a calendar, not a committee.

Internally, pull language from Watch so we are not inventing a new thesis every week. Wire and Field already gave us the repeated objections. Internal flagged delivery risk on the pilot. Competitor noise is loud but thin. That is the spine.

Please reply with one paragraph: what proof asset you can own by Friday, and who validates it. If we cannot name the validator, we do not ship the sentence.

Thanks`;

function WrapCenter({ animKey, reducedMotion }: { animKey: string; reducedMotion: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const linkedInRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const wrapItRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, click: false });
  const [liText, setLiText] = useState("");
  const [emText, setEmText] = useState("");
  const [showWrapCursor, setShowWrapCursor] = useState(true);
  const [liSelected, setLiSelected] = useState(false);
  const [emSelected, setEmSelected] = useState(false);
  const [showWrapBtn, setShowWrapBtn] = useState(false);
  const [results, setResults] = useState(false);

  useEffect(() => {
    setPhase(0);
    setCursor({ x: 0, y: 0, visible: false, click: false });
    setLiText("");
    setEmText("");
    setShowWrapCursor(true);
    setLiSelected(false);
    setEmSelected(false);
    setShowWrapBtn(false);
    setResults(false);
    if (reducedMotion) {
      setLiText(WRAP_LI);
      setEmText(WRAP_EMAIL);
      setShowWrapCursor(false);
      setLiSelected(true);
      setEmSelected(true);
      setResults(true);
      return;
    }
    const t0 = window.setTimeout(() => setPhase(1), 400);
    const t1 = window.setTimeout(() => setPhase(2), 1000);
    const t2 = window.setTimeout(() => setPhase(3), 1700);
    const t3 = window.setTimeout(() => setPhase(4), 2150);
    const t4 = window.setTimeout(() => setPhase(5), 2800);
    const t5 = window.setTimeout(() => {
      setPhase(6);
      setShowWrapBtn(true);
    }, 3000);
    const t6 = window.setTimeout(() => setPhase(7), 3450);
    const t7 = window.setTimeout(() => setPhase(8), 3950);
    const t8 = window.setTimeout(() => {
      setPhase(9);
      setShowWrapCursor(false);
      setResults(true);
    }, 4250);
    return () => {
      [t0, t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout);
    };
  }, [animKey, reducedMotion]);

  useEffect(() => {
    if (phase === 3) {
      setLiSelected(true);
      setCursor(c => ({ ...c, click: true }));
      const t = window.setTimeout(() => setCursor(c => ({ ...c, click: false })), 200);
      return () => window.clearTimeout(t);
    }
    if (phase === 5) {
      setEmSelected(true);
      setCursor(c => ({ ...c, click: true }));
      const t = window.setTimeout(() => setCursor(c => ({ ...c, click: false })), 200);
      return () => window.clearTimeout(t);
    }
    if (phase === 8) {
      setCursor(c => ({ ...c, click: true }));
      const t = window.setTimeout(() => setCursor(c => ({ ...c, click: false })), 200);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current.getBoundingClientRect();
    if (phase === 0) {
      setCursor(c => ({ ...c, visible: false, click: false }));
      return;
    }
    if (phase === 1) {
      const el = linkedInRef.current?.getBoundingClientRect();
      if (el && el.width > 0) {
        setCursor({
          x: el.left - wrap.left + el.width * 0.5,
          y: el.top - wrap.top + el.height * 0.5,
          visible: true,
          click: false,
        });
      } else {
        setCursor({ x: wrap.width * 0.42, y: 32, visible: true, click: false });
      }
      return;
    }
    if (phase === 2 || phase === 3) {
      const el = linkedInRef.current?.getBoundingClientRect();
      if (el && el.width > 0) {
        setCursor({
          x: el.left - wrap.left + el.width * 0.5,
          y: el.top - wrap.top + el.height * 0.5,
          visible: true,
          click: false,
        });
      }
      return;
    }
    if (phase === 4 || phase === 5) {
      const el = emailRef.current?.getBoundingClientRect();
      if (el && el.width > 0) {
        setCursor({
          x: el.left - wrap.left + el.width * 0.5,
          y: el.top - wrap.top + el.height * 0.5,
          visible: true,
          click: false,
        });
      }
      return;
    }
    if ((phase === 6 || phase === 7 || phase === 8) && wrapItRef.current) {
      const el = wrapItRef.current.getBoundingClientRect();
      if (el.width > 0) {
        setCursor({
          x: el.left - wrap.left + el.width * 0.5,
          y: el.top - wrap.top + el.height * 0.5,
          visible: true,
          click: false,
        });
      }
      return;
    }
    if (phase >= 9) {
      setCursor({ x: 0, y: 0, visible: false, click: false });
    }
  }, [phase, showWrapBtn, results]);

  useEffect(() => {
    if (!results || reducedMotion) return;
    let li = 0;
    let em = 0;
    const step = 22;
    const id = window.setInterval(() => {
      li = Math.min(WRAP_LI.length, li + step);
      em = Math.min(WRAP_EMAIL.length, em + step);
      setLiText(WRAP_LI.slice(0, li));
      setEmText(WRAP_EMAIL.slice(0, em));
      if (li >= WRAP_LI.length && em >= WRAP_EMAIL.length) window.clearInterval(id);
    }, 5);
    return () => window.clearInterval(id);
  }, [results, reducedMotion]);

  if (results) {
    return (
      <div key={animKey} ref={wrapRef} style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            minHeight: 0,
            animation: reducedMotion ? "none" : `xpEwDemoBubble 0.35s ${EASE} both`,
          }}
        >
          <div
            style={{
              borderRadius: 10,
              padding: "10px 12px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div className="xp-mono" style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: "var(--xp-gold)", textTransform: "uppercase" }}>
              LinkedIn Post
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.5, color: textWhite, overflow: "auto", whiteSpace: "pre-wrap" }}>
              {liText}
              {liText.length > 0 && liText.length < WRAP_LI.length ? (
                <span style={{ display: "inline-block", width: 4, height: 11, marginLeft: 1, background: "var(--xp-gold)", verticalAlign: "-1px", opacity: 0.65 }} />
              ) : null}
            </div>
          </div>
          <div
            style={{
              borderRadius: 10,
              padding: "10px 12px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div className="xp-mono" style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: "var(--xp-gold)", textTransform: "uppercase" }}>
              Email
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.5, color: textWhite, overflow: "auto", whiteSpace: "pre-wrap" }}>
              {emText}
              {emText.length > 0 && emText.length < WRAP_EMAIL.length ? (
                <span style={{ display: "inline-block", width: 4, height: 11, marginLeft: 1, background: "var(--xp-gold)", verticalAlign: "-1px", opacity: 0.65 }} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={animKey} ref={wrapRef} style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
      {showWrapCursor ? <DemoCursor x={cursor.x} y={cursor.y} visible={cursor.visible} click={cursor.click} /> : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          alignContent: "start",
          flex: showWrapBtn ? "0 0 auto" : 1,
        }}
      >
        {OUTPUT_LABELS.map((name, i) => {
          const isLi = name === "LinkedIn Post";
          const isEm = name === "Email";
          const selected = (isLi && liSelected) || (isEm && emSelected);
          return (
            <div
              key={name}
              ref={isLi ? linkedInRef : isEm ? emailRef : undefined}
              style={{
                borderRadius: 9,
                padding: "9px 10px",
                fontSize: 10,
                fontWeight: selected ? 600 : 500,
                letterSpacing: "0.02em",
                color: selected ? "var(--xp-gold)" : "rgba(255,255,255,0.55)",
                border: selected ? "1px solid rgba(200,169,110,0.32)" : "1px solid rgba(255,255,255,0.08)",
                background: selected ? "rgba(200,169,110,0.06)" : "rgba(255,255,255,0.03)",
                animation: reducedMotion ? "none" : `xpEwDemoTile 0.35s ${EASE} both`,
                animationDelay: reducedMotion ? "0ms" : `${35 * i}ms`,
              }}
            >
              {name}
            </div>
          );
        })}
      </div>
      {showWrapBtn ? (
        <button
          type="button"
          ref={wrapItRef}
          style={{
            ...mono,
            flexShrink: 0,
            marginTop: "auto",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(200,169,110,0.32)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "default",
            background: "rgba(200,169,110,0.14)",
            color: textWhite,
          }}
        >
          Wrap it
        </button>
      ) : null}
    </div>
  );
}

function AdvisorColumn() {
  return (
    <aside
      className="xpEwDemo-advisor"
      style={{
        width: 122,
        flexShrink: 0,
        ...panelSurface,
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <AdvisorBlock title="Quality" bars={[0.9, 0.7, 0.55]} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 0" }} />
      <AdvisorBlock title="Reed" bars={[0.85, 0.5]} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 0" }} />
      <AdvisorBlock title="Signals" bars={[0.65, 0.75, 0.45]} />
    </aside>
  );
}

function AdvisorBlock({ title, bars }: { title: string; bars: number[] }) {
  return (
    <div>
      <div
        className="xp-mono"
        style={{
          ...mono,
          fontSize: 8,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.32)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {bars.map((w, i) => (
          <div
            key={i}
            style={{
              height: 3,
              borderRadius: 2,
              width: `${Math.round(w * 100)}%`,
              background: "linear-gradient(90deg, rgba(200,169,110,0.38), rgba(255,255,255,0.08))",
            }}
          />
        ))}
      </div>
    </div>
  );
}
