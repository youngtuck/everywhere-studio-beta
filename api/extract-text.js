import formidable from "formidable";
import fs from "fs";
import { setCorsHeaders } from "./_cors.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) return res.status(400).json({ error: "No file provided" });

    const buffer = fs.readFileSync(file.filepath);
    const name = file.originalFilename || "file";
    let text = "";

    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer);
      const sheets = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        return `[Sheet: ${sheetName}]\n${XLSX.utils.sheet_to_csv(sheet)}`;
      });
      text = sheets.join("\n\n");
    } else if (name.endsWith(".pptx")) {
      const JSZip = await import("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml"));
      const slides = [];
      for (const sf of slideFiles.sort()) {
        const xml = await zip.files[sf].async("string");
        const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
        const slideText = textMatches.map(m => m.replace(/<\/?a:t>/g, "")).join(" ");
        if (slideText.trim()) slides.push(slideText.trim());
      }
      text = slides.map((s, i) => `[Slide ${i + 1}]\n${s}`).join("\n\n");
    } else {
      text = buffer.toString("utf-8");
    }

    fs.unlinkSync(file.filepath);

    if (text.length > 30000) {
      text = text.slice(0, 30000) + "\n\n[Content truncated for length]";
    }

    return res.json({ text, filename: name, length: text.length });
  } catch (err) {
    console.error("[extract-text] error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
