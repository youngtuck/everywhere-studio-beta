import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { MARKETING_CSS, EASE } from "../styles/marketing";
import { LEGAL_DOC_TYPOGRAPHY_CSS } from "../styles/legalDocTypographyCss";

const articleColumn: CSSProperties = {
  maxWidth: 740,
  margin: "0 auto",
  padding: "80px 48px 120px",
  background: "var(--xp-white)",
  fontFamily: "var(--xp-font)",
  color: "var(--xp-text)",
};

export default function CookiePolicyPage() {
  const navigate = useNavigate();
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const goSignup = useCallback(() => navigate("/auth?mode=signup"), [navigate]);
  const goSignin = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="xp" style={{ opacity: pageLoaded ? 1 : 0, transition: `opacity 0.5s ${EASE}` }}>
      <style>{MARKETING_CSS}</style>
      <style>{LEGAL_DOC_TYPOGRAPHY_CSS}</style>
      <MarketingNav onSignin={goSignin} onSignup={goSignup} />

      <div data-nav-theme="light" style={{ minHeight: "100vh", background: "var(--xp-off)", paddingTop: 88 }}>
        <article className="xp-legal-doc" style={articleColumn}>
          <h1>Cookie Policy</h1>
          <p className="xp-legal-doc-operator">Mixed Grill, LLC · Effective April 12, 2026</p>

          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. Similar technologies include
            local storage, session storage, pixels, and software development kits. This Cookie Policy explains how Mixed
            Grill, LLC (<strong>we</strong>, <strong>us</strong>, or <strong>our</strong>) uses these technologies in
            connection with IdeasOut and related sites (collectively, the <strong>Service</strong>).
          </p>

          <h2>2. Why We Use Cookies</h2>
          <p>We use cookies and similar technologies to:</p>
          <ul>
            <li>Keep you signed in and maintain session state.</li>
            <li>Remember preferences such as language and display settings.</li>
            <li>Protect accounts from fraud and abuse.</li>
            <li>Measure performance, diagnose errors, and understand how features are used.</li>
            <li>Improve marketing pages and measure campaign effectiveness, where permitted.</li>
          </ul>

          <h2>3. Types of Cookies We Use</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Purpose</th>
                <th>Typical duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Strictly necessary</td>
                <td>Authentication, security, load balancing, consent records</td>
                <td>Session or up to 12 months</td>
              </tr>
              <tr>
                <td>Functional</td>
                <td>Preference storage, UI state, feature toggles you select</td>
                <td>Up to 12 months</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>Aggregated usage metrics, performance monitoring, product improvement</td>
                <td>Up to 24 months</td>
              </tr>
              <tr>
                <td>Marketing (if used)</td>
                <td>Attribution, referral tracking, ad measurement on our own marketing properties</td>
                <td>Up to 24 months</td>
              </tr>
            </tbody>
          </table>

          <h2>4. First-Party and Third-Party Cookies</h2>
          <p>
            <strong>First-party cookies</strong> are set by us. <strong>Third-party cookies</strong> are set by partners
            we use for hosting, authentication, analytics, error reporting, or embedded content. Third-party providers
            have their own privacy and cookie policies.
          </p>

          <h2>5. Your Choices</h2>
          <p>You can control cookies through:</p>
          <ul>
            <li>Browser settings that block or delete cookies.</li>
            <li>Private or incognito modes, which may limit persistence of cookies.</li>
            <li>Industry opt-out tools where available for advertising technologies we may use.</li>
          </ul>
          <p>
            If you block strictly necessary cookies, parts of the Service may not function, including sign-in and security
            features.
          </p>

          <h2>6. Do Not Track</h2>
          <p>
            There is no consistent industry standard for Do Not Track signals. We currently do not respond to all such
            signals, but we aim to honor legally required opt-outs where applicable.
          </p>

          <h2>7. Updates</h2>
          <p>
            We may update this Cookie Policy when our practices change. We will post the updated version with a new
            effective date and, where required, provide additional notice.
          </p>

          <h2>8. Contact</h2>
          <p>
            For questions about cookies, contact{" "}
            <a href="mailto:privacy@everywhere.studio">privacy@everywhere.studio</a>.
          </p>
        </article>
        <MarketingFooter />
      </div>
    </div>
  );
}
