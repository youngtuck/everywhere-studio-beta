import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { CLAUDE_MODEL } from "./_config.js";
import { setCorsHeaders } from "./_cors.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  const results = { prompts: {}, api: null, timestamp: new Date().toISOString() };

  // Test 1: Can we load prompt files?
  const testFiles = ["gate-0-echo.md", "gate-4-elena.md", "betterish.md"];
  const basePaths = [
    path.join(process.cwd(), "src", "lib", "agents", "prompts"),
    path.join("/var/task", "src", "lib", "agents", "prompts"),
  ];
  if (typeof __dirname !== "undefined") {
    basePaths.push(path.join(__dirname, "..", "src", "lib", "agents", "prompts"));
  }

  for (const file of testFiles) {
    results.prompts[file] = { found: false, paths_tried: [] };
    for (const base of basePaths) {
      const fullPath = path.join(base, file);
      results.prompts[file].paths_tried.push(fullPath);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        results.prompts[file].found = true;
        results.prompts[file].size = content.length;
        results.prompts[file].path = fullPath;
        break;
      } catch (e) {
        // continue trying
      }
    }
  }

  // Test 2: List files in the prompts directory (if it exists)
  for (const base of basePaths) {
    try {
      const files = fs.readdirSync(base);
      results.promptDir = { path: base, files: files.slice(0, 20), count: files.length };
      break;
    } catch {}
  }

  // Test 3: Can we call the Anthropic API?
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 50,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
      });
      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      results.api = { status: "ok", response: text.slice(0, 100) };
    } catch (err) {
      results.api = { status: "error", message: err.message, code: err.status };
    }
  } else {
    results.api = { status: "error", message: "ANTHROPIC_API_KEY not set" };
  }

  return res.status(200).json(results);
}
