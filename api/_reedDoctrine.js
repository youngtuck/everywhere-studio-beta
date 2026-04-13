import fs from "fs";
import path from "path";

/**
 * Load canonical Reed thought-partner doctrine (reed-capture.md) for API system prompts.
 * @param {number} [maxChars]
 * @returns {string}
 */
export function loadReedDoctrine(maxChars = 2800) {
  const paths = [
    path.join(process.cwd(), "src", "lib", "agents", "prompts", "reed-capture.md"),
    path.join("/var/task", "src", "lib", "agents", "prompts", "reed-capture.md"),
  ];
  if (typeof __dirname !== "undefined") {
    paths.push(path.join(__dirname, "..", "src", "lib", "agents", "prompts", "reed-capture.md"));
  }
  for (const p of paths) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      if (!content) continue;
      if (content.length <= maxChars) return content.trim();
      return `${content.slice(0, maxChars).trim()}\n\n[Reed doctrine truncated for context budget]`;
    } catch {
      /* try next path */
    }
  }
  return "";
}
