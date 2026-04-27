import { useState } from "react";
import { Upload, File as FileIcon, X } from "lucide-react";
import JSZip from "jszip";

interface LocalFile {
  id: string;
  file: File;
}

const MAX_COMBINED_TEXT_CHARS = 100_000;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PDF_COUNT = 4;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function extractDocxPlainText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Missing word/document.xml");
  const xml = await doc.async("string");
  return xml
    .replace(/<w:p[^>]*>/gi, "\n")
    .replace(/<w:tab[^>]*>/gi, "\t")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface VoiceWritingPayload {
  combinedText: string;
  pdfAttachments?: { filename: string; base64: string }[];
}

interface VoiceUploadProps {
  onComplete: (payload: VoiceWritingPayload) => void | Promise<void>;
}

export function VoiceUpload({ onComplete }: VoiceUploadProps) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: LocalFile[] = [];
    Array.from(fileList).forEach(f => {
      next.push({ id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`, file: f });
    });
    setFiles(prev => [...prev, ...next]);
    setLocalError(null);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setLocalError(null);
  };

  const analyze = async () => {
    if (!files.length || processing) return;
    setProcessing(true);
    setLocalError(null);

    const textParts: string[] = [];
    const pdfAttachments: { filename: string; base64: string }[] = [];
    const perFileErrors: string[] = [];

    for (const item of files) {
      const f = item.file;
      const lower = f.name.toLowerCase();
      try {
        if (lower.endsWith(".txt") || lower.endsWith(".md")) {
          const t = (await f.text()).trim();
          if (!t) {
            perFileErrors.push(`${f.name} is empty.`);
            continue;
          }
          textParts.push(`## ${f.name}\n\n${t}`);
        } else if (lower.endsWith(".docx")) {
          const t = (await extractDocxPlainText(f)).trim();
          if (!t) {
            perFileErrors.push(`${f.name} had no extractable text.`);
            continue;
          }
          textParts.push(`## ${f.name}\n\n${t}`);
        } else if (lower.endsWith(".pdf")) {
          if (pdfAttachments.length >= MAX_PDF_COUNT) {
            perFileErrors.push(`${f.name} skipped (max ${MAX_PDF_COUNT} PDFs).`);
            continue;
          }
          if (f.size > MAX_PDF_BYTES) {
            perFileErrors.push(`${f.name} is too large (max ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB per PDF).`);
            continue;
          }
          const buf = await f.arrayBuffer();
          pdfAttachments.push({ filename: f.name, base64: bufferToBase64(buf) });
        } else {
          perFileErrors.push(`${f.name} has an unsupported type.`);
        }
      } catch {
        perFileErrors.push(`${f.name} could not be read.`);
      }
    }

    let combinedText = textParts.join("\n\n").trim();
    if (combinedText.length > MAX_COMBINED_TEXT_CHARS) {
      combinedText =
        combinedText.slice(0, MAX_COMBINED_TEXT_CHARS)
        + "\n\n[Samples truncated for analysis. Add fewer or shorter files if you need the full corpus included.]";
    }

    if (!combinedText && pdfAttachments.length === 0) {
      setLocalError(
        perFileErrors.length
          ? perFileErrors.join(" ")
          : "No readable text or PDFs. Check file types and try again."
      );
      setProcessing(false);
      return;
    }

    try {
      await onComplete({ combinedText, pdfAttachments: pdfAttachments.length ? pdfAttachments : undefined });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        style={{
          marginBottom: 24,
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid rgba(200, 169, 110, 0.22)",
          background: "rgba(200, 169, 110, 0.06)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          <strong style={{ color: "#E8D4A8" }}>How upload-based Voice DNA works.</strong>{" "}
          Your files stay in this browser until you tap Analyze. We read .txt and .md directly, pull text out of .docx
          files, and send PDFs to the model as documents so it can read layout and wording. Everything is combined into
          one profile request. The same analyst prompt as the interview path turns that material into Voice DNA markers,
          a markdown profile for Reed, and scores you can review on the next screen.
        </p>
      </div>

      <div
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".txt,.md,.pdf,.docx";
          input.multiple = true;
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
        style={{
          border: "2px dashed rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "60px 40px",
          textAlign: "center" as const,
          transition: "all 0.25s",
          cursor: "pointer",
        }}
      >
        <Upload size={32} color="rgba(255,255,255,0.5)" />
        <p
          style={{
            marginTop: 16,
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: "#ffffff",
          }}
        >
          Drop your writing here or click to browse
        </p>
        <p
          style={{
            marginTop: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Articles, blog posts, newsletters, emails, anything you have written.
        </p>
        <p
          style={{
            marginTop: 16,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Accepts .txt, .md, .docx, and .pdf (up to {MAX_PDF_COUNT} PDFs, {Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB each).
        </p>
      </div>

      {!!files.length && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map(item => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
              }}
            >
              <FileIcon size={16} color="rgba(255,255,255,0.6)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.file.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {(item.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(item.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 4,
                  borderRadius: 999,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {localError ? (
        <p
          style={{
            marginTop: 16,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "#f87171",
            lineHeight: 1.45,
          }}
        >
          {localError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!files.length || processing}
        onClick={analyze}
        style={{
          marginTop: 24,
          width: "100%",
          background: files.length && !processing ? "#C8961A" : "rgba(255,255,255,0.08)",
          color: files.length && !processing ? "#07090f" : "rgba(255,255,255,0.4)",
          border: "none",
          borderRadius: 999,
          padding: "14px 16px",
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          cursor: files.length && !processing ? "pointer" : "default",
        }}
      >
        {processing ? "Preparing samples…" : "Analyze my writing"}
      </button>
    </div>
  );
}
