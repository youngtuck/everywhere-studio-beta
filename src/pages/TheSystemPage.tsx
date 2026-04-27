import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MARKETING_CSS, EASE } from "../styles/marketing";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingBuiltForCta from "../components/marketing/MarketingBuiltForCta";
import MarketingFooter from "../components/marketing/MarketingFooter";
import Reveal from "../components/marketing/Reveal";

const DNA_MODULES = [
  {
    name: "VoiceDNA",
    subhead: "Your voice. Captured. Consistent.",
    body: "Most AI sounds like AI. It hedges. It pads. It uses the same phrases everyone uses. VoiceDNA captures how you actually think and speak, then applies that pattern to everything you produce. The rhythm. The vocabulary. The way you start sentences. The way you land a point. The result: content that sounds like you wrote it. Because, in the way that matters, you did.",
    bg: "var(--xp-white)",
  },
  {
    name: "BrandDNA",
    subhead: "Organizations have a voice too.",
    body: "BrandDNA applies the same intelligence to how your company communicates. Consistent across channels. Consistent across team members. Consistent with what you actually stand for. Stop managing inconsistency. Start publishing coherence.",
    bg: "var(--xp-off)",
  },
  {
    name: "MethodDNA",
    subhead: "Built for coaching ecosystems.",
    body: "If you operate inside a professional methodology, your clients deserve a studio that already knows their world. MethodDNA provisions IdeasOut with your framework, your vocabulary, and your philosophy. Clients start inside the system, not configuring from scratch. The methodology delivers the framework. IdeasOut delivers the content infrastructure that makes it land.",
    bg: "var(--xp-white)",
  },
];

export default function TheSystemPage() {
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
          }}>What's Inside</div>
          <h1 style={{
            fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 600,
            letterSpacing: "-0.04em", lineHeight: 1.08,
            color: "var(--xp-on-dark)", marginBottom: 24,
            animation: `xpHeroHead 1s ${EASE} 0.6s both`,
          }}>Three DNA modules. One intelligence infrastructure.</h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65, color: "var(--xp-dim-dark)",
            maxWidth: 500, margin: "0 auto",
            animation: `xpHeroSub 0.8s ${EASE} 0.9s both`,
          }}>Each module is a different entry point. Each one solves a specific problem. All three run on the same system.</p>
        </div>
      </section>

      {/* DNA Module Sections */}
      {DNA_MODULES.map((mod, i) => (
        <section
          key={mod.name}
          data-nav-theme="light"
          className="xp-sect"
          style={{ padding: "var(--xp-section-pad-y) var(--xp-section-pad-x)", background: mod.bg }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <Reveal>
              <div className="xp-glass-card" style={{ padding: "40px 36px", maxWidth: 800, margin: "0 auto" }}>
                <div className="xp-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--xp-ter)", marginBottom: 20 }}>
                  Module {String(i + 1).padStart(2, "0")}
                </div>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                  {mod.name}
                </h2>
                <p style={{ fontSize: 18, lineHeight: 1.5, color: "var(--xp-sec)", marginBottom: 24, fontWeight: 500 }}>
                  {mod.subhead}
                </p>
                <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--xp-text)", margin: 0 }}>
                  {mod.body}
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      ))}

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
