import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MARKETING_CSS, EASE } from "../styles/marketing";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingBuiltForCta from "../components/marketing/MarketingBuiltForCta";
import MarketingFooter from "../components/marketing/MarketingFooter";
import Reveal from "../components/marketing/Reveal";

export default function AboutPage() {
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
          }}>About</div>
          <h1 style={{
            fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 600,
            letterSpacing: "-0.04em", lineHeight: 1.08,
            color: "var(--xp-on-dark)", marginBottom: 24,
            animation: `xpHeroHead 1s ${EASE} 0.6s both`,
          }}>Why IdeasOut Exists</h1>
        </div>
      </section>

      {/* Mark: context + story (one surface) */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <div className="xp-glass-card" style={{ padding: "44px 40px" }}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--xp-text)", marginBottom: 4 }}>Mark Sylvester</div>
              <div className="xp-mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--xp-ter)", marginBottom: 22 }}>Co-founder, Coastal Intelligence</div>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", margin: "0 0 28px" }}>
                Mark Sylvester is a co-founder of Coastal Intelligence, an AI think tank and consultancy, based in Santa Barbara. IdeasOut™ is his platform for thought leaders, because the ideas in your head belong everywhere.
              </p>
              <div style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, var(--xp-border), transparent)",
                margin: "0 0 28px",
              }} />
              <div className="xp-mono" style={{
                fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--xp-ter)", marginBottom: 16,
              }}>In Mark's words</div>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 20 }}>
                It started with a Substack and a problem I couldn't solve.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 20 }}>
                I had things to say. I was writing every week, building the audience, learning what landed and what didn't. But the gap between what I was thinking and what I was actually publishing was driving me crazy. The ideas were there. The system to get them out wasn't.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", marginBottom: 20 }}>
                So I started building one. One week at a time. A function here, a checkpoint there. Each piece solving the specific problem in front of me. After enough weeks, I looked up and realized I hadn't just fixed my own workflow. I'd built infrastructure that any practitioner with something important to say could use.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", fontWeight: 500, margin: 0 }}>
                That's IdeasOut. Built from the inside out, by someone who needed it first.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The Infrastructure */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-off)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 24 }}>
              The problem wasn't a lack of ideas. It was a lack of infrastructure.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", marginBottom: 24 }}>
              IdeasOut was built inside Mixed Grill, LLC after watching the same pattern repeat: leaders with real thinking to share, no system capable of keeping pace with it. The tools existed. But tools don't think. Tools don't ask questions. Tools don't push back when the premise is weak or tell you the hook isn't working. What was missing was a system. Something that watches the landscape, works the idea all the way through, and wraps the output for the world, without losing what made the thinking valuable in the first place. That system is IdeasOut.
            </p>
          </Reveal>
        </div>
      </section>

      {/* A New Category */}
      <section data-nav-theme="dark" className="xp-sect" style={{
        padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-navy-deep)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--xp-on-dark)", marginBottom: 24 }}>
              Structured Intelligence.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-dim-dark)", marginBottom: 24 }}>
              IdeasOut is not an AI writing tool. Not a content scheduler. Not a prompt library dressed up as a platform. It's a new category: Structured Intelligence.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-dim-dark)" }}>
              Composed Intelligence behind one conversation. Every session has a first listener who asks the right questions. A quality system that won't let mediocre content through. An intelligence layer monitoring your category while you sleep. The system thinks with you. Not for you.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Your Data */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-white)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 24 }}>
              Your Thinking Stays Yours.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="xp-glass-card" style={{ padding: "32px 36px", borderLeft: "3px solid var(--xp-gold)" }}>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", marginBottom: 24 }}>
                IdeasOut never trains on your content. Never shares it. Never uses it to improve outputs for anyone else.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", fontWeight: 500, margin: 0 }}>
                Your ideas, your voice profile, your content catalog. They belong to you. Full stop.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The Company */}
      <section data-nav-theme="light" className="xp-sect" style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: "var(--xp-off)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 24 }}>
              Mixed Grill, LLC
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-sec)", marginBottom: 24 }}>
              IdeasOut is a product of Mixed Grill, LLC. Mixed Grill builds systems at the intersection of strategy and communication.
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
            <MarketingBuiltForCta onRequestAccess={goSignup} onSignIn={goSignin} />
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
