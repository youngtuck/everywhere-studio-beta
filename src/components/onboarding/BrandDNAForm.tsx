import { useState } from "react";
import { Upload } from "lucide-react";
import type { BrandDNA } from "../../utils/brandDNAProcessor";

interface BrandDNAFormProps {
  onComplete: (data: { brandDna: BrandDNA }) => void;
  onSkip: () => void;
}

export function BrandDNAForm({ onComplete, onSkip }: BrandDNAFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [tagline, setTagline] = useState("");
  const [brandVoiceDescription, setBrandVoiceDescription] = useState("");
  const [toneInput, setToneInput] = useState("");
  const [toneAttributes, setToneAttributes] = useState<string[]>([]);
  const [wordsToAvoidInput, setWordsToAvoidInput] = useState("");
  const [wordsToAvoid, setWordsToAvoid] = useState<string[]>([]);
  const [keyMessages, setKeyMessages] = useState("");

  const addToneAttribute = () => {
    const trimmed = toneInput.trim();
    if (!trimmed) return;
    setToneAttributes(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setToneInput("");
  };

  const addWordToAvoid = () => {
    const trimmed = wordsToAvoidInput.trim();
    if (!trimmed) return;
    setWordsToAvoid(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setWordsToAvoidInput("");
  };

  const submit = () => {
    const now = new Date().toISOString();
    const brandDna: BrandDNA = {
      company_name: companyName,
      industry,
      target_audience: "",
      brand_voice_description: brandVoiceDescription,
      tone_attributes: toneAttributes,
      language_guidelines: "",
      primary_colors: [],
      secondary_colors: [],
      font_families: [],
      logo_description: "",
      tagline,
      value_proposition: "",
      key_messages: keyMessages ? keyMessages.split("\n").map(s => s.trim()).filter(Boolean) : [],
      prohibited_language: wordsToAvoid,
      logo_urls: [],
      additional_docs: [],
      created_at: now,
      updated_at: now,
    };
    onComplete({ brandDna });
  };

  const pillRow = (items: string[], onRemove: (value: string) => void) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onRemove(item)}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "6px 10px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.85)",
            cursor: "pointer",
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: "#ffffff",
          margin: "0 0 12px",
        }}
      >
        One more thing.
      </h2>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 24px",
        }}
      >
        Voice DNA captures how you sound. Brand DNA captures how your company looks, speaks, and positions itself.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Company name
          </label>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Your company"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "12px 14px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Industry
          </label>
          <input
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="Leadership development, SaaS, advisory..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "12px 14px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Tagline
          </label>
          <input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="Short phrase you use externally"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "12px 14px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Brand voice description
          </label>
          <textarea
            value={brandVoiceDescription}
            onChange={e => setBrandVoiceDescription(e.target.value)}
            placeholder="How would you describe your company's tone of voice?"
            rows={4}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "12px 14px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Tone attributes
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={toneInput}
              onChange={e => setToneInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToneAttribute();
                }
              }}
              placeholder="authoritative, approachable..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 10,
                padding: "10px 12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: "#ffffff",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={addToneAttribute}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
          {pillRow(toneAttributes, value => setToneAttributes(prev => prev.filter(x => x !== value)))}
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Words to avoid
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={wordsToAvoidInput}
              onChange={e => setWordsToAvoidInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWordToAvoid();
                }
              }}
              placeholder="revolutionary, game changing..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 10,
                padding: "10px 12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: "#ffffff",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={addWordToAvoid}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
          {pillRow(wordsToAvoid, value => setWordsToAvoid(prev => prev.filter(x => x !== value)))}
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
            }}
          >
            Key messages
          </label>
          <textarea
            value={keyMessages}
            onChange={e => setKeyMessages(e.target.value)}
            placeholder="One message per line is best."
            rows={4}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "12px 14px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 8,
            padding: "16px 16px 14px",
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Upload size={16} color="rgba(255,255,255,0.6)" />
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            You can upload brand guides, logos, and docs later in Settings.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 32,
        }}
      >
        <button
          type="button"
          onClick={submit}
          style={{
            flex: 1,
            minWidth: 160,
            border: "none",
            borderRadius: 999,
            padding: "14px 18px",
            background: "#C8961A",
            color: "#07090f",
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save Brand DNA
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            flex: 1,
            minWidth: 160,
            borderRadius: 999,
            padding: "14px 18px",
            border: "1px solid rgba(255,255,255,0.35)",
            background: "transparent",
            color: "#ffffff",
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            cursor: "pointer",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

