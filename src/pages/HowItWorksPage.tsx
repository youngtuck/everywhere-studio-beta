import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MARKETING_CSS, EASE } from "../styles/marketing";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingBuiltForCta from "../components/marketing/MarketingBuiltForCta";
import MarketingFooter from "../components/marketing/MarketingFooter";
import Reveal from "../components/marketing/Reveal";
import { marketingDemoClickRingKeyframes } from "../components/marketing/MarketingDemoCursor";
import { WatchDeepDemo, WorkDeepDemo, WrapDeepDemo } from "../components/marketing/HowItWorksFlowDemos";

const CHECKPOINTS = [
  { id: "dedup", name: "Deduplication", desc: "No repeated content." },
  { id: "research", name: "Research Validation", desc: "Every claim verified." },
  { id: "voice", name: "Voice Authenticity", desc: "Sounds like you wrote it." },
  { id: "engage", name: "Engagement", desc: "Passes the opening test." },
  { id: "slop", name: "SLOP Detection", desc: "No AI padding. No filler. No fluff." },
  { id: "editorial", name: "Editorial Excellence", desc: "Publication grade. No exceptions." },
  { id: "risk", name: "Perspective and Risk", desc: "No blind spots." },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const goSignin = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="xp" style={{ opacity: pageLoaded ? 1 : 0, transition: `opacity 0.5s ${EASE}` }}>
      <style>{MARKETING_CSS}</style>
      <style>{marketingDemoClickRingKeyframes()}</style>
      <MarketingNav onSignin={goSignin} />

      {/* Hero */}
      <section data-nav-theme="dark" style={{
        minHeight: "80vh", background: "var(--xp-navy-deep)", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800 }}>
          <div className="xp-mono" style={{
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--xp-dim-dark)", marginBottom: 28,
            animation: `xpHeroLabel 0.8s ${EASE} 0.3s both`,
          }}>The System</div>
          <h1 style={{
            fontSize: "clamp(40px, 8vw, 88px)", fontWeight: 600,
            letterSpacing: "-0.04em", lineHeight: 1.06,
            color: "var(--xp-on-dark)", marginBottom: 20,
            animation: `xpHeroHead 1s ${EASE} 0.6s both`,
          }}>WATCH. WORK. WRAP.</h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65, color: "var(--xp-dim-dark)",
            maxWidth: 520, margin: "0 auto",
            animation: `xpHeroSub 0.8s ${EASE} 0.9s both`,
          }}>IdeasOut runs on one sequence. Every session follows the same path.</p>
        </div>
      </section>

      {/* Phase One: Watch */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Reveal>
            <div className="xp-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 40 }}>Phase One</div>
            <h2 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 10 }}>
              WATCH.
            </h2>
            <p style={{ fontSize: "clamp(17px, 2.4vw, 22px)", lineHeight: 1.45, color: "var(--xp-sec)", fontWeight: 500, marginBottom: 24 }}>
              Intelligence before execution.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 28 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Watch · 01</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Set what you watch for</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                Interests steer what surfaces in your feed. Add the phrases and themes you care about, tune the set, then move on when you are ready to read signals.
              </p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Watch · 02</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Open the briefing</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                IdeasOut monitors your landscape overnight. By the time you arrive, the briefing is ready. Signals rank by impact, angles map toward Work, and you are looking at ranked triggers, not noise.
              </p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Watch · 03</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Use one signal in Work</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                When a line is strong enough, tap Use this. It lands as a structured starter in Work. You stay in control of send, and you do not start the day catching up.
              </p>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <WatchDeepDemo animKey="hiw-watch" />
          </Reveal>
        </div>
      </section>

      {/* Phase Two: Work */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-off)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Reveal>
            <div className="xp-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 40 }}>Phase Two</div>
            <h2 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 10 }}>
              WORK.
            </h2>
            <p style={{ fontSize: "clamp(17px, 2.4vw, 22px)", lineHeight: 1.45, color: "var(--xp-sec)", fontWeight: 500, marginBottom: 24 }}>
              One idea. All the way through.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 28 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Work · 01</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Intake with Reed</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                Reed opens with what you want the reader to do. The interview pulls the real brief out of you, not the polite version. That agreement sets the spine for the whole piece.
              </p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Work · 02</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Outline and edit</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                Build this turns the interview into an outline, then into draft text you can tighten. Work moves through Intake, Outline, and Edit before the quality system touches the file.
              </p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Work · 03</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Pipeline, review, send</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                Blocking checkpoints run in order: voice, research, SLOP, editorial, risk, Impact Score, Human Voice Test. Nothing exits Work until it clears. Review is where you confirm, then Send to Wrap moves the approved draft downstream.
              </p>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <WorkDeepDemo animKey="hiw-work" />
          </Reveal>
        </div>
      </section>

      {/* Phase Three: Wrap */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Reveal>
            <div className="xp-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 40 }}>Phase Three</div>
            <h2 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 10 }}>
              WRAP.
            </h2>
            <p style={{ fontSize: "clamp(17px, 2.4vw, 22px)", lineHeight: 1.45, color: "var(--xp-sec)", fontWeight: 500, marginBottom: 24 }}>
              Ideas become assets.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 28 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Wrap · 01</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Pick your surfaces</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                Approved work lands in Wrap. Toggle every channel that matters for this idea. On means Wrap includes it in the run, off skips it so you stay focused.
              </p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Wrap · 02</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Run Wrap once</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                One button adapts structure, tone, and length for each surface. LinkedIn, newsletter, deck, script, report, one-pager. The format changes, the thinking survives it.
              </p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="xp-glass-card" style={{ padding: "28px 32px", marginTop: 16 }}>
              <div className="xp-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 12 }}>Wrap · 03</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 12 }}>Copy the versions you need</h3>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--xp-sec)", margin: 0 }}>
                You get paste-ready pieces in parallel. Same argument, different containers. Grab what fits, leave what does not, and ship without rewriting from zero.
              </p>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <WrapDeepDemo animKey="hiw-wrap" />
          </Reveal>
        </div>
      </section>

      {/* Quality System */}
      <section data-nav-theme="dark" className="xp-sect" style={{
        padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-navy-deep)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--xp-on-dark)", textAlign: "center", marginBottom: 16 }}>
              Blocking checkpoints. No bypass.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--xp-dim-dark)", textAlign: "center", maxWidth: 500, margin: "0 auto 64px" }}>
              Nothing ships until the pipeline clears.
            </p>
          </Reveal>

          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
            {CHECKPOINTS.map((cp, i) => (
              <Reveal key={cp.id} delay={i * 60}>
                <div
                  className="xp-glass-card-dark"
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column" as const,
                    alignItems: "flex-start",
                    gap: 4,
                    borderRadius: 10,
                    marginBottom: i < CHECKPOINTS.length - 1 ? 6 : 0,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--xp-on-dark)", letterSpacing: "-0.01em" }}>{cp.name}</div>
                  <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--xp-dim-dark)", margin: 0 }}>{cp.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={600}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-dim-dark)", textAlign: "center", maxWidth: 600, margin: "64px auto 0" }}>
              After checkpoints: Impact Score (75 minimum). After Impact Score: Human Voice Test. Pass or rewrite. No middle ground.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA Section */}
      <section data-nav-theme="dark" className="xp-sect" style={{
        padding: "160px 48px", background: "var(--xp-navy-deep)",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <Reveal>
            <MarketingBuiltForCta onSignIn={goSignin} />
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
