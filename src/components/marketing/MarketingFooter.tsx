import { Link } from "react-router-dom";
import Logo from "../Logo";

export default function MarketingFooter() {
  return (
    <footer style={{ padding: "40px 48px", background: "var(--xp-white)", borderTop: "1px solid var(--xp-border)" }}>
      <div className="xp-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <Logo size="sm" variant="light" />
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link
            to="/terms"
            style={{ fontSize: 12, color: "var(--xp-ter)", textDecoration: "none", fontFamily: "var(--xp-font)", transition: "color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--xp-text)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--xp-ter)")}
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy"
            style={{ fontSize: 12, color: "var(--xp-ter)", textDecoration: "none", fontFamily: "var(--xp-font)", transition: "color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--xp-text)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--xp-ter)")}
          >
            Privacy Policy
          </Link>
          <Link
            to="/cookies"
            style={{ fontSize: 12, color: "var(--xp-ter)", textDecoration: "none", fontFamily: "var(--xp-font)", transition: "color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--xp-text)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--xp-ter)")}
          >
            Cookie Policy
          </Link>
        </div>
        <span style={{ fontSize: 12, color: "var(--xp-ter)" }}>&copy; {new Date().getFullYear()} Mixed Grill, LLC. IdeasOut&trade;. All rights reserved.</span>
      </div>
    </footer>
  );
}
