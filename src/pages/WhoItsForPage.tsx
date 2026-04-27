import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MARKETING_CSS, EASE } from "../styles/marketing";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingBuiltForCta from "../components/marketing/MarketingBuiltForCta";
import MarketingFooter from "../components/marketing/MarketingFooter";
import Reveal from "../components/marketing/Reveal";

const BUILT_FOR = [
  "You identify as a practitioner, not a marketer.",
  "You have real things to say and a real audience that needs to hear them.",
  "You've tried the tools. The prompts, the templates, the AI writing apps. None of them thought with you. They filled in blanks.",
  "You don't need another tool. You need a system.",
];

export default function WhoItsForPage() {
  const navigate = useNavigate();
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const goSignup = useCallback(() => navigate("/auth?mode=signup"), [navigate]);
  const goSignin = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="xp" style={{ opacity: pageLoaded ? 1 : 0, transition: `opacity 0.5s ${EASE}` }}>
      <style>{MARKETING_CSS}</style>
      <MarketingNav onSignin={goSignin} onSignup={goSignup} />

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
          }}>Who It's For</div>
          <h1 style={{
            fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 600,
            letterSpacing: "-0.04em", lineHeight: 1.08,
            color: "var(--xp-on-dark)", marginBottom: 24,
            animation: `xpHeroHead 1s ${EASE} 0.6s both`,
          }}>The Overloaded Visionary</h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65, color: "var(--xp-dim-dark)",
            maxWidth: 500, margin: "0 auto",
            animation: `xpHeroSub 0.8s ${EASE} 0.9s both`,
          }}>You know the type because you are the type.</p>
        </div>
      </section>

      {/* The Problem */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", marginBottom: 24 }}>
              The thinking is clear. The ideas are sharp. The strategy makes sense. But between the clarity in your head and the audience that needs to hear it, there is a mountain.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 24 }}>
              Drafts pile up. Content sits half-finished. The newsletter is six weeks behind. The LinkedIn post never got written. The keynote transcript from March is still in your Downloads folder.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 24 }}>
              You're not stuck because you lack ideas. You're stuck because the system doesn't match the pace of your thinking.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 24 }}>
              You have two jobs: strategy and communication. You're doing one. The other one is waiting.
            </p>
          </Reveal>
          <Reveal delay={400}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", fontWeight: 500 }}>
              IdeasOut is the system that ends the wait.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Who We Built This For */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-off)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 48 }}>
              Who we built this for
            </h2>
          </Reveal>
          {BUILT_FOR.map((item, i) => (
            <Reveal key={i} delay={(i + 1) * 100}>
              <div className="xp-glass-card" style={{ padding: "24px 32px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "var(--xp-gold)", marginTop: 8, flexShrink: 0,
                  }} />
                  <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", margin: 0 }}>
                    {item}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Who This Is Not For */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 24 }}>
              Who this is not for
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="xp-glass-card" style={{ padding: "32px 36px", borderLeft: "3px solid rgba(200,120,100,0.3)" }}>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", marginBottom: 24 }}>
                IdeasOut will not make average thinking sound better than it is. The system runs quality checkpoints with blocking authority. If the thinking isn't there, the system will tell you. If you're looking for a faster way to produce generic content, this is the wrong place.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", fontWeight: 500, margin: 0 }}>
                Signal only. No noise.
              </p>
            </div>
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
            <MarketingBuiltForCta onRequestAccess={goSignup} onSignIn={goSignin} />
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
