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

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const goSignin = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="xp" style={{ opacity: pageLoaded ? 1 : 0, transition: `opacity 0.5s ${EASE}` }}>
      <style>{MARKETING_CSS}</style>
      <style>{LEGAL_DOC_TYPOGRAPHY_CSS}</style>
      <MarketingNav onSignin={goSignin} />

      <div data-nav-theme="light" style={{ minHeight: "100vh", background: "var(--xp-off)", paddingTop: 88 }}>
        <article className="xp-legal-doc" style={articleColumn}>
          <h1>Terms of Service</h1>
          <p className="xp-legal-doc-operator">Mixed Grill, LLC · Effective April 12, 2026</p>

          <h2>1. Agreement to These Terms</h2>
          <p>
            These Terms of Service (the <strong>Terms</strong>) govern your access to and use of IdeasOut and
            related websites, applications, and services (collectively, the <strong>Service</strong>) operated by Mixed
            Grill, LLC (<strong>we</strong>, <strong>us</strong>, or <strong>our</strong>). By accessing or using the
            Service, you agree to these Terms. If you do not agree, do not use the Service.
          </p>
          <p>
            If you use the Service on behalf of a company or other legal entity, you represent that you have authority
            to bind that entity to these Terms, and <strong>you</strong> refers to that entity.
          </p>

          <h2>2. The Service</h2>
          <p>
            IdeasOut is a software platform that helps users capture ideas, run structured workflows, and
            generate content outputs using composed intelligence features, including integrations with third-party
            infrastructure and model providers. We may modify, suspend, or discontinue features at any time, with or
            without notice, subject to applicable law and any separate agreement that applies to you.
          </p>
          <p>
            We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components. The
            Service may depend on third parties outside our control.
          </p>

          <h2>3. Accounts and Eligibility</h2>
          <p>
            You must be at least 18 years old (or the age of majority where you live) to use the Service. You agree to
            provide accurate account information and to keep your credentials secure. You are responsible for activity
            under your account unless you notify us promptly of unauthorized use.
          </p>
          <p>
            We may refuse registration, suspend access, or close accounts that violate these Terms, create risk, or
            conflict with legal obligations.
          </p>

          <h2>4. License to Use the Service</h2>
          <p>
            Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access
            and use the Service for your internal business or personal purposes, consistent with documentation we
            publish.
          </p>
          <p>You will not, and will not assist others to:</p>
          <ul>
            <li>Copy, modify, distribute, sell, lease, or reverse engineer any part of the Service except as expressly permitted.</li>
            <li>Circumvent technical limits, security controls, or usage restrictions.</li>
            <li>Use the Service to build a competing product or service, or to benchmark or scrape the Service without our prior written consent.</li>
            <li>Use the Service in violation of law, third-party rights, or acceptable use rules in Section 5.</li>
          </ul>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Generate, store, or distribute unlawful, defamatory, harassing, fraudulent, hateful, or discriminatory content.</li>
            <li>Violate privacy, publicity, or intellectual property rights of others.</li>
            <li>Transmit malware, conduct denial-of-service attacks, or probe systems without authorization.</li>
            <li>Send unsolicited commercial communications in bulk in violation of anti-spam laws.</li>
            <li>Attempt to access accounts or data that do not belong to you.</li>
          </ul>
          <p>
            We may investigate violations and cooperate with law enforcement. We may remove content, throttle usage, or
            suspend accounts when we reasonably believe a violation occurred.
          </p>

          <h2>6. Customer Content and Instructions</h2>
          <p>
            You retain ownership of text, files, prompts, and other materials you submit to the Service (<strong>Customer
            Content</strong>), subject to licenses you grant below. You represent that you have all rights needed to
            submit Customer Content and that your submission does not violate law or third-party rights.
          </p>
          <p>
            You grant us a worldwide, non-exclusive license to host, reproduce, process, transmit, display, and create
            derivative works from Customer Content solely to provide, secure, improve, and support the Service, and to
            comply with law. We do not sell your Customer Content to third parties as a data broker service.
          </p>

          <h2>7. Outputs, AI Features, and Intellectual Property</h2>
          <p>
            The Service may generate drafts, summaries, plans, or other outputs (<strong>Outputs</strong>) based on your
            inputs and system configuration. Outputs may be inaccurate, incomplete, or unsuitable for a particular use.
            You are solely responsible for reviewing, editing, and deciding how to use Outputs, including compliance with
            law, contracts, and industry rules.
          </p>
          <p>
            To the extent permitted by law and subject to our rights in the Service itself, we assign to you any rights we
            may have in Outputs created for you through the Service, excluding any pre-existing materials, templates, or
            our underlying models and software. You acknowledge that similar prompts may produce similar results for
            other users and that we do not warrant uniqueness.
          </p>
          <p>
            We and our licensors own all rights in the Service, including software, branding, documentation, and
            aggregated, de-identified analytics derived from use of the Service. Except for the limited license in
            Section 4, no rights are granted to you.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            The Service may integrate with third-party products (for example, authentication, storage, analytics, or
            model providers). Your use of third-party services may be subject to separate terms and privacy policies. We
            are not responsible for third-party services.
          </p>

          <h2>9. Fees, Trials, and Taxes</h2>
          <p>
            If you purchase a paid plan, you agree to the fees, billing cycle, and payment method presented at purchase.
            Fees are non-refundable except where required by law or expressly stated otherwise. You are responsible for
            applicable taxes. We may change fees with reasonable advance notice where required.
          </p>

          <h2>10. Confidentiality</h2>
          <p>
            If we share non-public information about the Service, roadmaps, or pricing with you, you will use reasonable
            care to protect it and will not disclose it except to personnel and advisors who need to know and are bound to
            confidentiality obligations.
          </p>

          <h2>11. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access if you materially breach these
            Terms, if we must comply with law, or if continuing the Service is impractical. Upon termination, Sections
            intended to survive (including intellectual property, disclaimers, limitation of liability, indemnity, and
            dispute terms) will survive.
          </p>

          <h2>12. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED <strong>AS IS</strong> AND <strong>AS AVAILABLE</strong>. TO THE MAXIMUM EXTENT
            PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT
            WARRANT THAT OUTPUTS WILL BE ACCURATE, COMPLETE, OR FREE FROM BIAS OR ERROR.
          </p>

          <h2>13. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER WE NOR OUR SUPPLIERS WILL BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
            GOODWILL, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY.
          </p>
          <p>
            OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT
            EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE EVENT GIVING
            RISE TO LIABILITY, OR (B) ONE HUNDRED U.S. DOLLARS ($100), IF YOU HAVE NOT HAD A PAYMENT OBLIGATION.
          </p>
          <p>
            Some jurisdictions do not allow certain limitations. In that case, our liability is limited to the fullest
            extent permitted by law.
          </p>

          <h2>14. Indemnification</h2>
          <p>
            You will defend and indemnify us and our affiliates, officers, directors, employees, and agents against any
            third-party claims, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from
            Customer Content, your use of the Service, your violation of these Terms, or your violation of law or
            third-party rights.
          </p>

          <h2>15. Dispute Resolution and Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware, excluding conflict-of-law rules. You and we
            agree that state and federal courts located in Delaware will have exclusive jurisdiction for disputes not
            subject to arbitration, if any, except that either party may seek injunctive relief in any court of competent
            jurisdiction to protect confidential information or intellectual property.
          </p>
          <p>
            You will bring any claim within one year after the cause of action accrues, or the claim is permanently
            barred, to the extent permitted by law.
          </p>

          <h2>16. Export and Sanctions</h2>
          <p>
            You represent that you are not located in, under the control of, or a national or resident of any country
            subject to comprehensive U.S. sanctions, and that you are not on any restricted party list. You will comply
            with applicable export control laws.
          </p>

          <h2>17. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. If a change is material, we will provide reasonable notice by
            posting an update, sending email, or showing an in-product notice. Your continued use after the effective date
            constitutes acceptance. If you do not agree, stop using the Service.
          </p>

          <h2>18. General</h2>
          <p>
            These Terms constitute the entire agreement between you and us regarding the Service and supersede prior
            agreements on the same subject. If any provision is unenforceable, the remaining provisions remain in effect.
            Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we
            may assign them in connection with a merger, acquisition, or sale of assets.
          </p>

          <h2>19. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@everywhere.studio">legal@everywhere.studio</a>.
          </p>
        </article>
        <MarketingFooter />
      </div>
    </div>
  );
}
