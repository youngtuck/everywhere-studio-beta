/**
 * Safe markdown-to-HTML conversion.
 * Escapes HTML entities before applying regex transforms, preventing XSS.
 * Output uses plain semantic tags (no inline styles). Style via .md-content CSS class.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeMarkdownToHtml(text: string): string {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let inParagraph = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headings (close any open paragraph or list first)
    if (/^####\s/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h4>${applyInline(line.replace(/^####\s*/, "").trim())}</h4>`);
      continue;
    }
    if (/^###\s/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h3>${applyInline(line.replace(/^###\s*/, "").trim())}</h3>`);
      continue;
    }
    if (/^##\s/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h2>${applyInline(line.replace(/^##\s*/, "").trim())}</h2>`);
      continue;
    }
    if (/^#\s/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<h1>${applyInline(line.replace(/^#\s*/, "").trim())}</h1>`);
      continue;
    }

    // Blockquotes
    if (/^&gt;\s/.test(trimmed)) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      out.push(`<blockquote>${applyInline(trimmed.replace(/^&gt;\s*/, ""))}</blockquote>`);
      continue;
    }

    // Unordered list items
    if (/^- /.test(trimmed)) {
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${applyInline(trimmed.replace(/^- /, ""))}</li>`);
      continue;
    }

    // If we were in a list and this line isn't a list item, close the list
    if (inList && !/^- /.test(trimmed)) {
      out.push("</ul>");
      inList = false;
    }

    // Empty line: close paragraph
    if (trimmed === "") {
      if (inParagraph) { out.push("</p>"); inParagraph = false; }
      continue;
    }

    // Regular text line
    if (!inParagraph) { out.push("<p>"); inParagraph = true; } else { out.push("<br/>"); }
    out.push(applyInline(trimmed));
  }

  if (inList) out.push("</ul>");
  if (inParagraph) out.push("</p>");
  return out.join("");
}

/** Apply inline formatting (bold, italic) to already-escaped text. */
function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}
