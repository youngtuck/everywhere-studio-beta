import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "./_config.js";
import { setCorsHeaders } from "./_cors.js";


export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

function safeFileName(name) {
  if (typeof name !== "string") return "upload";
  return name
    .replace(/[\/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const { userId, fileName, fileContent, fileType, resourceType, title, description } = req.body || {};

  if (!userId || !fileContent || !title) {
    return res.status(400).json({ error: "userId, fileContent (base64), and title required" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Store the file in Supabase Storage
    const filePath = `${userId}/${Date.now()}_${safeFileName(fileName)}`;
    const buffer = Buffer.from(fileContent, "base64");

    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(filePath, buffer, {
        contentType: fileType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[api/upload-resource] Storage upload failed", uploadError);
      // Continue anyway, we can still extract text
    }

    // Extract text content from the file
    // For PDFs and docs, send to Claude to extract and summarize
    let extractedContent = "";

    if (anthropicKey && fileContent) {
      try {
        const client = new Anthropic({ apiKey: anthropicKey });
        const mediaType = fileType || "application/pdf";
        const response = await client.beta.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          betas: ["pdfs-2024-09-25"],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: fileContent,
                  },
                },
                {
                  type: "text",
                  text: "Extract the complete text content from this document. Preserve the structure, headings, and key information. Output the content as clean markdown. Do not summarize. Extract everything.",
                },
              ],
            },
          ],
        });
        extractedContent = response.content?.[0]?.type === "text" ? response.content[0].text : "";
      } catch (extractErr) {
        console.error("[api/upload-resource] Text extraction failed", extractErr);
        extractedContent = "(File uploaded but text extraction failed. Original file stored in Supabase Storage.)";
      }
    } else {
      extractedContent = "(Text extraction requires ANTHROPIC_API_KEY. Original file stored in Supabase Storage.)";
    }

    // Insert into resources table (with sanitization)
    const safeName = (n) => typeof n === "string" ? n.trim().slice(0, 200).replace(/<[^>]*>/g, "") : "";
    const { data, error: insertError } = await supabase
      .from("resources")
      .insert({
        user_id: userId,
        resource_type: (resourceType || "reference").slice(0, 50),
        title: safeName(title) || safeName(fileName) || "Untitled",
        description: safeName(description) || `Uploaded from ${safeName(fileName) || "file"}`,
        content: (extractedContent || "(No text content extracted)").slice(0, 100000),
        is_active: true,
        metadata: { original_file: filePath, file_name: safeFileName(fileName), file_type: fileType },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[api/upload-resource] Insert failed", insertError);
      return res.status(500).json({ error: "Upload failed. Please try again." });
    }

    return res.status(200).json({ resource: data });
  } catch (err) {
    console.error("[api/upload-resource]", err);
    return res.status(502).json({ error: "Upload failed. Please try again." });
  }
}
