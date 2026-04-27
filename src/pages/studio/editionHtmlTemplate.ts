/**
 * editionHtmlTemplate.ts
 * Generates a standalone HTML file for a Sunday Edition download.
 * CSS extracted from THE_SUNDAY_EDITION visual target (Brand DNA v2.0).
 */

// Vite raw import: loads the CSS file as a plain string (no processing)
import EDITION_CSS from "./edition-download.css?raw";

// ---- Types ----

interface EditionForExport {
  name: string;
  status: string;
  impact_score: number;
  content: Record<string, unknown>;
  created_at: string;
}

// ---- Helpers ----

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function gStr(ct: Record<string, unknown>, ...path: string[]): string {
  let obj: unknown = ct;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else return "";
  }
  return typeof obj === "string" ? obj : "";
}

function gArr(ct: Record<string, unknown>, ...path: string[]): string[] {
  let obj: unknown = ct;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else return [];
  }
  return Array.isArray(obj) ? obj.filter((v): v is string => typeof v === "string") : [];
}

function muted(text: string): string {
  return `<span style="color:var(--mid-gray);font-style:italic;font-size:14px">${esc(text)}</span>`;
}

function or(value: string, fallback: string): string {
  return value ? esc(value) : muted(fallback);
}

function nl2p(text: string): string {
  if (!text) return "";
  return text.split("\n\n").map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

function imgSrc(ct: Record<string, unknown>, basePath: string[]): string {
  const b64 = gStr(ct, ...basePath, "base64");
  if (b64) return b64;
  return gStr(ct, ...basePath, "generatedUrl");
}

function imgTag(src: string, alt: string, style: string): string {
  if (!src) return "";
  return `<img src="${src.startsWith("data:") ? src : esc(src)}" alt="${esc(alt)}" style="${style}">`;
}

function deliverableHeader(title: string, badge?: string): string {
  const badgeHtml = badge ? `<span class="badge">${esc(badge)}</span>` : "";
  return `<div class="deliverable-header"><h3>${esc(title)}</h3>${badgeHtml}</div>`;
}

function copyBtn(targetId: string): string {
  return `<button class="copy-btn" onclick="copyDeliverable(this, '${targetId}')">Copy</button>`;
}

function deliverableHeaderWithCopy(title: string, copyId: string): string {
  return `<div class="deliverable-header"><h3>${esc(title)}</h3>${copyBtn(copyId)}</div>`;
}

// ---- Checkpoint labels ----

const CP_LABELS = [
  "Voice DNA Hard Rules", "Verified Claims", "Voice Match", "7-Second Hook",
  "Zero AI Padding", "Publication Grade", "SEO Meta Description", "Cultural Sensitivity",
];

// ---- Main export ----

export function generateEditionHtml(edition: EditionForExport): string {
  const ct = edition.content || {};
  const date = new Date(edition.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const title = gStr(ct, "article", "title") || edition.name;
  const subtitle = gStr(ct, "article", "subtitle");

  // B-roll
  const broll: Array<{ label: string; prompt: string; src: string }> = (() => {
    const raw = ct.brollImages;
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).map((item, i) => {
      const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const b64 = typeof o.base64 === "string" ? o.base64 : "";
      const url = typeof o.generatedUrl === "string" ? o.generatedUrl : "";
      return { label: String(o.label || `IMAGE ${i + 1}`), prompt: String(o.prompt || ""), src: b64 || url };
    });
  })();

  // Checkpoints
  const checks = (ct.checkpoints && typeof ct.checkpoints === "object" ? ct.checkpoints : {}) as Record<string, boolean | undefined>;

  // Hashtags
  const hashtags = gArr(ct, "seo", "hashtags");
  const metaDesc = gStr(ct, "seo", "metaDescription");

  // Nav
  const navItems = [
    { id: "editors-note", label: "Editor's Note" },
    { id: "score", label: "Impact Score" },
    { id: "article", label: "Substack" },
    { id: "callout", label: "Callout" },
    { id: "notes", label: "Notes" },
    { id: "podcast", label: "Podcast" },
    { id: "images", label: "Images" },
    { id: "music", label: "Music" },
    { id: "shownotes", label: "Show Notes" },
    { id: "descript", label: "Descript" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "seo", label: "SEO" },
    { id: "gates", label: "Checkpoints" },
  ];

  const heroSrc = imgSrc(ct, ["heroImage"]);
  const storyUrl = gStr(ct, "storyUrl") || "#";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>THE SUNDAY EDITION - ${esc(title)} - IdeasOut</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${EDITION_CSS}
</style>
</head>
<body>

<div class="header">
  <h1>The Sunday Edition - IdeasOut</h1>
  <h2>${or(title, "Untitled Edition")}</h2>
  ${subtitle ? `<div class="header-subtitle">${esc(subtitle)}</div>` : ""}
  <div class="meta">${esc(date)} &nbsp;|&nbsp; <span class="wordmark"><span class="ideas">Ideas</span><span class="out">Out</span><span class="tm">&trade;</span></span> &nbsp;|&nbsp; 12 Deliverables</div>
</div>

<div class="nav">
  ${navItems.map(n => `<a onclick="navTo('${n.id}')">${n.label}</a>`).join("\n  ")}
</div>

<div class="container">

<!-- Editor's Note -->
<div class="deliverable" id="editors-note">
  ${deliverableHeader("Editor's Note")}
  <div class="editors-note-body">
    ${gStr(ct, "editorsNote") ? nl2p(gStr(ct, "editorsNote")) : muted("Not yet defined")}
  </div>
</div>

<!-- Impact Score -->
<div class="deliverable" id="score">
  ${deliverableHeader("Impact Score")}
  <div class="deliverable-body">
    <div class="score-total">
      <span class="num">${edition.impact_score || "-"}</span><span class="denom"> /1000</span>
      <div class="verdict">${edition.impact_score >= 800 ? "Ships" : edition.impact_score > 0 ? "Needs work" : "Pending"}</div>
    </div>
  </div>
</div>

<!-- 01: Substack Article -->
<div class="deliverable" id="article">
  ${deliverableHeaderWithCopy("Deliverable 1 - Substack Article", "article-body")}
  <div class="deliverable-body" id="article-body">
    ${heroSrc ? imgTag(heroSrc, "Hero image", "width:100%;border-radius:4px;margin-bottom:24px;max-height:400px;object-fit:cover") : ""}
    ${gStr(ct, "article", "body") ? nl2p(gStr(ct, "article", "body")) : muted("Not yet defined")}
  </div>
</div>

<!-- 01b: Callout Block -->
<div class="deliverable" id="callout">
  ${deliverableHeaderWithCopy("Deliverable 1b - Callout Block", "callout-body")}
  <div class="deliverable-body" id="callout-body">
    ${gStr(ct, "callout", "primary")
      ? `<blockquote>${esc(gStr(ct, "callout", "primary"))}</blockquote>`
      : muted("Not yet defined")}
    ${gStr(ct, "callout", "alternate")
      ? `<p style="color:var(--mid-gray);font-size:14px">Alternate: ${esc(gStr(ct, "callout", "alternate"))}</p>`
      : ""}
  </div>
</div>

<!-- 02: Substack Notes -->
<div class="deliverable" id="notes">
  ${deliverableHeaderWithCopy("Deliverable 2 - Substack Notes", "notes-body")}
  <div class="deliverable-body" id="notes-body">
    ${["launch", "standalone1", "standalone2", "standalone3", "standalone4", "followup"].map((key, i) => {
      const labels = ["Launch Note", "Standalone #1", "Standalone #2", "Standalone #3", "Standalone #4", "Follow-up"];
      const val = gStr(ct, "notes", key);
      return `<h4>${labels[i]}</h4>\n    <p>${val ? esc(val) : muted("Not yet defined").replace(/<\/?span[^>]*>/g, "")}</p>`;
    }).join("\n    ")}
  </div>
</div>

<!-- 03: Podcast Script -->
<div class="deliverable" id="podcast">
  ${deliverableHeaderWithCopy("Deliverable 3 - Podcast Script", "podcast-body")}
  <div class="deliverable-body" id="podcast-body">
    ${gStr(ct, "podcast", "script") ? nl2p(gStr(ct, "podcast", "script")) : muted("Not yet defined")}
  </div>
</div>

<!-- 04+05: Images -->
<div class="deliverable" id="images">
  ${deliverableHeader("Deliverable 4+5 - Images")}
  <div class="deliverable-body">
    <h4>Hero Image - 16:9</h4>
    ${heroSrc ? imgTag(heroSrc, "Hero", "width:100%;border-radius:4px;margin-bottom:12px") : ""}
    <p>${gStr(ct, "heroImage", "prompt") ? esc(gStr(ct, "heroImage", "prompt")) : muted("Not yet defined").replace(/<\/?span[^>]*>/g, "")}</p>
    <h4>B-Roll Companion Images - 9:16</h4>
    ${broll.length > 0 ? broll.map(img => {
      let html = `<p style="font-weight:600;color:var(--ink);margin-bottom:4px">${esc(img.label)}</p>`;
      if (img.src) html += imgTag(img.src, img.label, "max-width:200px;border-radius:4px;margin-bottom:8px");
      html += `<p>${img.prompt ? esc(img.prompt) : muted("Not yet defined").replace(/<\/?span[^>]*>/g, "")}</p>`;
      return html;
    }).join("\n    ") : muted("Not yet defined")}
  </div>
</div>

<!-- 06: Music -->
<div class="deliverable" id="music">
  ${deliverableHeaderWithCopy("Deliverable 6 - Music Brief + Track", "music-body")}
  <div class="deliverable-body" id="music-body">
    ${gStr(ct, "music", "vibe") ? `<h4>${esc(gStr(ct, "music", "vibe"))}</h4>` : ""}
    ${gStr(ct, "music", "brief") ? nl2p(gStr(ct, "music", "brief")) : muted("Not yet defined")}
    ${gStr(ct, "music", "trackUrl") ? `<p><a href="${esc(gStr(ct, "music", "trackUrl"))}" target="_blank" rel="noopener noreferrer" style="color:var(--cornflower)">Listen on Suno</a></p>` : ""}
  </div>
</div>

<!-- 07: Show Notes -->
<div class="deliverable" id="shownotes">
  ${deliverableHeaderWithCopy("Deliverable 7 - Show Notes", "shownotes-body")}
  <div class="deliverable-body" id="shownotes-body">
    ${gStr(ct, "showNotes", "description") ? `<p>${esc(gStr(ct, "showNotes", "description"))}</p>` : muted("Not yet defined")}
    ${gArr(ct, "showNotes", "bullets").length > 0 ? `<ul>${gArr(ct, "showNotes", "bullets").map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    ${gArr(ct, "showNotes", "links").length > 0 ? gArr(ct, "showNotes", "links").map(l => `<p><a href="${esc(l)}" target="_blank" rel="noopener noreferrer" style="color:var(--cornflower)">${esc(l)}</a></p>`).join("") : ""}
  </div>
</div>

<!-- 08: Descript Video Script -->
<div class="deliverable" id="descript">
  ${deliverableHeaderWithCopy("Deliverable 8 - Descript Video Script", "descript-body")}
  <div class="deliverable-body" id="descript-body">
    ${gStr(ct, "descript", "script") ? nl2p(gStr(ct, "descript", "script")) : muted("Not yet defined")}
  </div>
</div>

<!-- 09+10: LinkedIn -->
<div class="deliverable" id="linkedin">
  ${deliverableHeaderWithCopy("Deliverable 9+10 - LinkedIn Post + First Comment", "linkedin-body")}
  <div class="deliverable-body" id="linkedin-body">
    <h4>Post Body</h4>
    ${gStr(ct, "linkedin", "postBody") ? nl2p(gStr(ct, "linkedin", "postBody")) : muted("Not yet defined")}
    <h4>First Comment</h4>
    ${gStr(ct, "linkedin", "firstComment") ? `<p>${esc(gStr(ct, "linkedin", "firstComment"))}</p>` : muted("Not yet defined")}
  </div>
</div>

<!-- 11: SEO -->
<div class="deliverable" id="seo">
  ${deliverableHeader("Deliverable 11 - SEO")}
  <div class="deliverable-body">
    <h4>Hashtags</h4>
    ${hashtags.length > 0
      ? `<p>${hashtags.map(t => esc(t)).join(" ")}</p>`
      : muted("Not yet defined")}
    <h4>Meta Description</h4>
    ${metaDesc
      ? `<p>${esc(metaDesc)}</p><p style="font-size:12px;color:var(--mid-gray)">${metaDesc.length} / 160 characters</p>`
      : muted("Not yet defined")}
  </div>
</div>

<!-- 12: Checkpoints -->
<div class="deliverable" id="gates">
  ${deliverableHeader("Deliverable 12 - Checkpoints")}
  <div class="deliverable-body">
    ${CP_LABELS.map(label => {
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const val = checks[key];
      const status = val === true ? "pass" : val === false ? "fail" : "pending";
      const badge = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "PENDING";
      const color = status === "pass" ? "var(--pass)" : status === "fail" ? "var(--fail)" : "var(--mid-gray)";
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--soft-fill)"><span style="font-size:14px;color:var(--slate)">${esc(label)}</span><span style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:${color}">${badge}</span></div>`;
    }).join("\n    ")}
  </div>
</div>

</div><!-- .container -->

<div class="footer">
  <div class="footer-left">
    <div class="footer-brand"><span class="wordmark"><span class="ideas">Ideas</span><span class="out">Out</span><span class="tm">&trade;</span></span></div>
    <div class="footer-divider"></div>
    <div class="footer-edition">The Sunday Edition</div>
  </div>
  <div class="footer-right">&copy; 2026 Mixed Grill, LLC &middot; <a href="https://ideasout.com">ideasout.com</a></div>
</div>

<script>
function setHeaderHeight(){var h=document.querySelector('.header');if(!h)return;var height=h.offsetHeight;document.documentElement.style.setProperty('--header-height',(height+3)+'px');document.querySelectorAll('.deliverable').forEach(function(d){d.style.scrollMarginTop=(height+52)+'px'});}
window.addEventListener('load',setHeaderHeight);window.addEventListener('resize',setHeaderHeight);

function navTo(id){var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}

function writeRichClipboard(html,plain,btn){if(navigator.clipboard&&window.ClipboardItem){var item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})});navigator.clipboard.write([item]).then(function(){btn.classList.add('copied');btn.textContent='Copied';setTimeout(function(){btn.classList.remove('copied');btn.textContent='Copy'},1500)},function(){navigator.clipboard.writeText(plain).then(function(){btn.classList.add('copied');btn.textContent='Copied';setTimeout(function(){btn.classList.remove('copied');btn.textContent='Copy'},1500)})});return;}navigator.clipboard.writeText(plain).then(function(){btn.classList.add('copied');btn.textContent='Copied';setTimeout(function(){btn.classList.remove('copied');btn.textContent='Copy'},1500)});}

function copyDeliverable(btn,targetId){var el=document.getElementById(targetId);if(!el)return;writeRichClipboard(el.innerHTML,el.innerText,btn);}

function downloadEdition(){var html='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;var blob=new Blob([html],{type:'text/html'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='${slugFilename(edition)}';document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url)},100);}
</script>

<button class="download-edition-btn" onclick="downloadEdition()" title="Download this Edition as HTML" style="position:fixed;bottom:20px;right:20px;z-index:500;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--ink);color:var(--honey);border:none;padding:10px 18px;border-radius:3px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2)">Download Edition</button>

</body>
</html>`;
}

function slugFilename(edition: EditionForExport): string {
  const date = new Date(edition.created_at).toISOString().slice(0, 10);
  const slug = edition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `ideasout-sunday-edition-${date}-${slug || "untitled"}.html`;
}

export function triggerEditionDownload(edition: EditionForExport): void {
  const html = generateEditionHtml(edition);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slugFilename(edition);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
