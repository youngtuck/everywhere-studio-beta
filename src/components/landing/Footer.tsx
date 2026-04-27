import Logo from "../Logo";
import { useNavigate } from "react-router-dom";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function FooterLink({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const Tag = href ? "a" : "button";
  const props: any = href
    ? { href, style: { color: "#64748B", fontSize: 12, fontFamily: "'Inter', sans-serif", textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", display: "inline-block", paddingBottom: 2 } }
    : { onClick, style: { color: "#64748B", fontSize: 12, fontFamily: "'Inter', sans-serif", textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", display: "inline-block", paddingBottom: 2 } };

  return (
    <Tag
      {...props}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.color = "#111111";
        const line = e.currentTarget.querySelector("[data-uline]") as HTMLElement;
        if (line) line.style.width = "100%";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.color = "#64748B";
        const line = e.currentTarget.querySelector("[data-uline]") as HTMLElement;
        if (line) line.style.width = "0";
      }}
    >
      {children}
      <span data-uline="" style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 1,
        width: 0,
        background: "#111111",
        transition: `width 0.2s ${EASE}`,
      }} />
    </Tag>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer style={{ background: "#F7F9FC", borderTop: "1px solid #E2E8F0", padding: "28px 40px 0" }}>
      {/* Top row */}
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, paddingBottom: 20 }}>
        <Logo size="sm" variant="light" />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <FooterLink onClick={() => navigate("/studio/dashboard")}>Studio</FooterLink>
          <FooterLink onClick={() => navigate("/auth")}>Sign in</FooterLink>
          <span style={{ fontSize: 12, color: "#64748B", fontFamily: "'Inter', sans-serif" }}>mark@coastalintelligence.ai</span>
          <button
            onClick={() => navigate("/auth?mode=signup")}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#111111",
              border: "none",
              borderRadius: 100,
              padding: "10px 24px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              transition: `background 0.25s ${EASE}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#4A90D9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#111111"; }}
          >
            Get Early Access
          </button>
        </div>
      </div>
      {/* Bottom row */}
      <div style={{ maxWidth: 1120, margin: "0 auto", borderTop: "1px solid #E2E8F0", padding: "16px 0" }}>
        <p style={{ fontSize: 11, color: "#AAAAAA", fontFamily: "'Inter', sans-serif", margin: 0 }}>
          &copy; 2026 Mixed Grill, LLC. IdeasOut&trade;. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
