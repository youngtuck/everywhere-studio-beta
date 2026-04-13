import JSZip from "jszip";

/** Plain text from .txt, .md, or .docx. Returns empty string for unsupported types. */
export async function extractPlainTextFromFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return (await file.text()).trim();
  }
  if (lower.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const doc = zip.file("word/document.xml");
    if (!doc) return "";
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
  return "";
}
