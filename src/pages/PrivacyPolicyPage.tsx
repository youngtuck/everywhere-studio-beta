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

export default function PrivacyPolicyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="xp-legal-doc-operator">Mixed Grill, LLC · Effective April 12, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how Mixed Grill, LLC (<strong>we</strong>, <strong>us</strong>, or{" "}
            <strong>our</strong>) collects, uses, discloses, and protects information in connection with IdeasOut
            and related websites and services (collectively, the <strong>Service</strong>). If you do not agree with
            this policy, do not use the Service.
          </p>

          <h2>2. Scope</h2>
          <p>
            This policy applies to information we collect when you visit our marketing pages, create an account, use the
            Service, communicate with us, or interact with integrations we offer. It does not apply to third-party sites
            or services that we do not control.
          </p>

          <h2>3. Information We Collect</h2>
          <p>We collect information in the categories below, depending on how you use the Service.</p>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Examples</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Account and profile</td>
                <td>Name, email address, organization, role, authentication identifiers</td>
                <td>You, your administrator, or identity provider</td>
              </tr>
              <tr>
                <td>Customer content</td>
                <td>Prompts, documents, uploads, session notes, configuration choices</td>
                <td>You</td>
              </tr>
              <tr>
                <td>Usage and device</td>
                <td>Log data, IP address, device type, browser, approximate location derived from IP, timestamps</td>
                <td>Automatically when you use the Service</td>
              </tr>
              <tr>
                <td>Support and communications</td>
                <td>Messages you send us, attachments, call recordings if offered and recorded with consent</td>
                <td>You</td>
              </tr>
              <tr>
                <td>Billing</td>
                <td>Billing contact, payment status, limited payment metadata (we may use a payment processor)</td>
                <td>You and payment processors</td>
              </tr>
              <tr>
                <td>Cookies and similar technologies</td>
                <td>Cookie IDs, local storage values, pixel data</td>
                <td>Automatic; see our Cookie Policy</td>
              </tr>
            </tbody>
          </table>

          <h2>4. How We Use Information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide, operate, maintain, secure, and improve the Service.</li>
            <li>Authenticate users, prevent fraud and abuse, and enforce our terms.</li>
            <li>Communicate about updates, incidents, billing, and support requests.</li>
            <li>Analyze usage in aggregated or de-identified form to improve product quality and reliability.</li>
            <li>Comply with law, respond to lawful requests, and protect rights, privacy, safety, and property.</li>
          </ul>

          <h2>5. Legal Bases (EEA, UK, and Switzerland)</h2>
          <p>If applicable privacy laws require a legal basis, we rely on one or more of the following:</p>
          <table>
            <thead>
              <tr>
                <th>Purpose</th>
                <th>Legal basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Provide the Service and customer support</td>
                <td>Performance of a contract; legitimate interests in operating a secure service</td>
              </tr>
              <tr>
                <td>Security, fraud prevention, and abuse detection</td>
                <td>Legitimate interests; legal obligations</td>
              </tr>
              <tr>
                <td>Product analytics in identifiable form where required</td>
                <td>Consent where required; otherwise legitimate interests with appropriate controls</td>
              </tr>
              <tr>
                <td>Marketing communications</td>
                <td>Consent where required; otherwise legitimate interests, with opt-out where applicable</td>
              </tr>
              <tr>
                <td>Compliance with law and legal process</td>
                <td>Legal obligations; legitimate interests</td>
              </tr>
            </tbody>
          </table>

          <h2>6. How We Share Information</h2>
          <p>We may share information with:</p>
          <ul>
            <li>
              <strong>Service providers</strong> who process data on our behalf, such as hosting, authentication,
              analytics, customer support tooling, email delivery, security monitoring, and payment processing.
            </li>
            <li>
              <strong>Model and infrastructure providers</strong> when required to run AI features you invoke, subject to
              contracts and safeguards appropriate to the processing.
            </li>
            <li>
              <strong>Professional advisors</strong>, such as lawyers and accountants, under confidentiality obligations.
            </li>
            <li>
              <strong>Authorities</strong> when required by law or to protect rights and safety.
            </li>
            <li>
              <strong>Business transfers</strong> in connection with a merger, acquisition, financing, or sale of assets,
              subject to appropriate safeguards.
            </li>
          </ul>
          <p>We do not sell personal information as the term is commonly defined in U.S. state privacy laws.</p>

          <h2>7. Retention</h2>
          <p>
            We retain information for as long as needed to provide the Service, comply with legal obligations, resolve
            disputes, and enforce agreements. Retention periods vary based on data type and legal requirements. When data
            is no longer needed, we delete or de-identify it, subject to backup and archival systems.
          </p>

          <h2>8. Security</h2>
          <p>
            We implement technical and organizational measures designed to protect information. No method of transmission
            or storage is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            We may process information in the United States and other countries where we or our providers operate. If we
            transfer personal data from regions that require safeguards, we use appropriate mechanisms such as standard
            contractual clauses where required.
          </p>

          <h2>10. Your Rights and Choices</h2>
          <p>Depending on your location, you may have rights to:</p>
          <ul>
            <li>Access, correct, or delete certain personal information.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Port personal information to another service, where technically feasible.</li>
            <li>Withdraw consent where processing is based on consent.</li>
            <li>Lodge a complaint with a supervisory authority.</li>
          </ul>
          <p>
            To exercise rights, contact <a href="mailto:privacy@everywhere.studio">privacy@everywhere.studio</a>. We may
            need to verify your request and may decline requests that conflict with law or legitimate rights of others.
          </p>

          <h2>11. California Privacy Rights</h2>
          <p>
            If the California Consumer Privacy Act or California Privacy Rights Act applies, California residents may have
            additional rights, including rights to know, delete, correct, and opt out of certain sharing. We do not sell
            personal information or share it for cross-context behavioral advertising in a manner that requires opt-out
            under CPRA, unless we notify you otherwise. You may designate an authorized agent where permitted by law.
          </p>

          <h2>12. Children</h2>
          <p>
            The Service is not directed to children under 16, and we do not knowingly collect personal information from
            children. If you believe we collected information from a child, contact us and we will take appropriate
            steps to delete it.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the updated policy with a new effective date
            and, where required, provide additional notice. Your continued use after the effective date constitutes
            acceptance of the updated policy where permitted by law.
          </p>

          <h2>14. Contact</h2>
          <p>
            For privacy questions, contact{" "}
            <a href="mailto:privacy@everywhere.studio">privacy@everywhere.studio</a>.
          </p>
        </article>
        <MarketingFooter />
      </div>
    </div>
  );
}
