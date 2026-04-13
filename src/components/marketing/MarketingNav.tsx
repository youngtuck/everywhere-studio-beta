import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMobile } from "../../hooks/useMobile";
import Logo from "../Logo";
import { EASE } from "../../styles/marketing";

const NAV_LINKS = [
  { label: "How It Works", path: "/how-it-works" },
  { label: "Who It's For", path: "/who-its-for" },
  { label: "The System", path: "/the-system" },
  { label: "About", path: "/about" },
];

interface MarketingNavProps {
  onSignin: () => void;
  onSignup: () => void;
}

export default function MarketingNav({ onSignin, onSignup }: MarketingNavProps) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [navTheme, setNavTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll("[data-nav-theme]");
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const t = (e.target as HTMLElement).dataset.navTheme as "dark" | "light";
            if (t) setNavTheme(t);
          }
        }
      },
      { rootMargin: "-1px 0px -95% 0px", threshold: 0 },
    );
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const isDarkNav = navTheme === "dark";

  return (
    <>
      <nav className={`xp-glass-nav xp-liquid-glass ${isDarkNav ? "xp-lg-dark" : "xp-lg-light"}`}>
        <div className="xp-liquid-glass-border" />
        <Logo
          size="sm"
          variant={isDarkNav ? "dark" : "light"}
          onClick={() => navigate("/explore")}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {!isMobile && (
            <div className="xp-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {NAV_LINKS.map(link => (
                <button
                  key={link.label}
                  className="xp-nav-link"
                  onClick={() => navigate(link.path)}
                  style={{ color: isDarkNav ? "rgba(255,255,255,0.55)" : "var(--xp-sec)" }}
                >
                  {link.label}
                </button>
              ))}
              <button className="xp-nav-link" onClick={onSignin} style={{
                color: isDarkNav ? "rgba(255,255,255,0.55)" : "var(--xp-sec)",
              }}>Sign In</button>
              <button className="xp-nav-cta" onClick={onSignup} style={
                isDarkNav
                  ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--xp-on-dark)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
                  : { background: "rgba(12,26,41,0.08)", border: "1px solid rgba(12,26,41,0.15)", color: "var(--xp-navy)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
              }>Request Access</button>
            </div>
          )}
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: "block", width: 20, height: 2, background: isDarkNav ? "var(--xp-on-dark)" : "var(--xp-text)", borderRadius: 1 }} />
              ))}
            </button>
          )}
        </div>
      </nav>

      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--xp-navy)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
          <button onClick={() => setMobileMenuOpen(false)} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", cursor: "pointer", fontSize: 28, color: "var(--xp-gold)", fontFamily: "var(--xp-font)", fontWeight: 300 }}>&times;</button>
          {[
            ...NAV_LINKS.map(l => ({ label: l.label, action: () => { setMobileMenuOpen(false); navigate(l.path); } })),
            { label: "Sign In", action: () => { setMobileMenuOpen(false); onSignin(); } },
            { label: "Request Access", action: () => { setMobileMenuOpen(false); onSignup(); } },
          ].map((link, i) => (
            <button key={link.label} onClick={link.action} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 24, fontWeight: 600, color: "var(--xp-white)",
              fontFamily: "var(--xp-font)", letterSpacing: "0.04em",
              animation: `xpSlideIn 0.5s ${EASE} ${i * 80}ms both`,
            }}>
              {link.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
