import { useState } from "react";
import type { BrandDNAResponse } from "../../utils/brandDNAProcessor";
import { enrichBrandDnaWithSupplements } from "../../utils/brandDNAProcessor";
import { BRAND_FIELD_GUIDES } from "../../lib/brandFieldDeepDives";
import { extractPlainTextFromFile } from "../../lib/extractLocalWritingText";

const PROMPT_CHIPS = [
  "Who must approve external copy, and what slows approvals down?",
  "Which phrases are banned on client decks or in sales scripts?",
  "How does your brand sound in email versus on stage?",
  "What proof do you always want mentioned above the fold?",
  "What competitor tone do you refuse to imitate, even subtly?",
];

const font = "'Afacad Flux', sans-serif";

function summarizeCaptured(brand: Record<string, unknown>): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (key: string, label: string) => {
    const v = brand[key];
    if (v === null || v === undefined || v === "") return;
    if (Array.isArray(v)) {
      const s = v.filter(Boolean).join(", ");
      if (s) rows.push({ label, value: s });
      return;
    }
    if (typeof v === "string" && v.trim()) rows.push({ label, value: v.trim() });
  };
  add("brand_name", "Brand name");
  add("category_position", "Category");
  add("tagline", "Tagline");
  add("target_audience", "Audience");
  add("brand_promise", "Promise");
  add("the_enemy", "Stands against");
  add("tone_of_voice", "Tone");
  add("summary", "Summary");
  return rows.slice(0, 12);
}

type Props = {
  draft: BrandDNAResponse;
  getAccessToken: () => Promise<string | null>;
  onBack: () => void;
  onComplete: (result: BrandDNAResponse) => Promise<void>;
};

export function BrandDnaUrlEnrichment({ draft, getAccessToken, onBack, onComplete }: Props) {
  const brand = (draft.brandDna || {}) as Record<string, unknown>;
  const captured = summarizeCaptured(brand);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendChip = (text: string) => {
    setNotes(prev => (prev ? `${prev.trim()}\n\n${text}` : text));
  };

  const saveAsIs = async () => {
    setBusy(true);
    setError(null);
    try {
      await onComplete(draft);
    } finally {
      setBusy(false);
    }
  };

  const blendAndSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Session expired. Sign in again, then return to this step.");
        setBusy(false);
        return;
      }
      const supplementaryFileTexts: { name: string; text: string }[] = [];
      for (const f of files) {
        const t = await extractPlainTextFromFile(f);
        if (t) supplementaryFileTexts.push({ name: f.name, text: t });
      }
      if (!notes.trim() && supplementaryFileTexts.length === 0) {
        setError("Add notes or upload at least one .txt, .md, or .docx file to blend.");
        setBusy(false);
        return;
      }
      const merged = await enrichBrandDnaWithSupplements({
        brandDna: brand,
        markdown: draft.markdown || "",
        supplementaryNotes: notes.trim(),
        supplementaryFileTexts,
        accessToken: token,
      });
      await onComplete(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not merge. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
        Review Brand DNA from your site
      </h2>
      <p style={{ fontFamily: font, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 24 }}>
        Here is what we pulled from your URL. Read the snapshot, open any guide below, then either continue as-is or
        blend in voice rules, positioning notes, or documents so Reed understands the brand the way you do.
      </p>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(200,169,110,0.25)",
          background: "rgba(200,169,110,0.06)",
        }}
      >
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
          CAPTURED FROM SITE
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.55 }}>
          {captured.map(row => (
            <li key={row.label} style={{ marginBottom: 8 }}>
              <strong style={{ color: "#E8D4A8" }}>{row.label}:</strong> {row.value}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
          FIELD GUIDES
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BRAND_FIELD_GUIDES.map(g => (
            <details
              key={g.field}
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                padding: "8px 12px",
              }}
            >
              <summary style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", cursor: "pointer" }}>
                {g.title}
              </summary>
              <p style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "8px 0 6px", lineHeight: 1.45 }}>{g.summary}</p>
              {g.paragraphs.map((p, i) => (
                <p key={i} style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, margin: "0 0 8px" }}>
                  {p}
                </p>
              ))}
            </details>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
          Do you want to add anything else?
        </div>
        <p style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 10, lineHeight: 1.45 }}>
          Tap a prompt to drop it into the box, edit in your words, or write freely. Then add files if you have voice
          guidelines, positioning docs, or reports (.txt, .md, .docx).
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {PROMPT_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => appendChip(chip)}
              style={{
                fontFamily: font,
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.75)",
                cursor: "pointer",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Positioning notes, banned words, approval rules, anecdotes about how the brand sounds in the wild…"
          rows={6}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            fontFamily: font,
            fontSize: 13,
            padding: 12,
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept=".txt,.md,.docx"
          multiple
          onChange={e => {
            const list = e.target.files;
            if (!list) return;
            setFiles(Array.from(list));
          }}
          style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.7)" }}
        />
        {files.length > 0 ? (
          <p style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            {files.length} file(s) selected. Text will be extracted when you blend.
          </p>
        ) : null}
      </div>

      {error ? (
        <p style={{ fontFamily: font, fontSize: 13, color: "#f87171", marginBottom: 12 }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          disabled={busy}
          onClick={saveAsIs}
          style={{
            flex: 1,
            minWidth: 160,
            padding: "14px 18px",
            borderRadius: 999,
            border: "none",
            background: "#C8961A",
            color: "#07090f",
            fontFamily: font,
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Saving…" : "Use website profile as-is"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={blendAndSave}
          style={{
            flex: 1,
            minWidth: 160,
            padding: "14px 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.35)",
            background: "transparent",
            color: "#fff",
            fontFamily: font,
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Blending…" : "Blend notes and files into profile"}
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onBack}
        style={{
          marginTop: 16,
          fontFamily: font,
          fontSize: 13,
          color: "rgba(255,255,255,0.45)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Analyze a different site
      </button>
    </section>
  );
}
