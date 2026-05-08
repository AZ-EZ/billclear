import Anthropic from "@anthropic-ai/sdk";

export async function POST(req) {
  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const { base64, mediaType, isPDF } = await req.json();
    if (!base64 || base64.length > 14_000_000) {
      return Response.json({ error: "File too large" }, { status: 400 });
    }
    const sourceBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [sourceBlock, {
          type: "text",
          text: `Extract ALL text from this medical document. Preserve line items with CPT codes, dollar amounts, dates, account numbers. Output only the extracted text. If not a medical document, respond exactly: NOT_MEDICAL_DOCUMENT`
        }]
      }]
    });
    const text = msg.content.find(b => b.type === "text")?.text?.trim() || "";
    if (text === "NOT_MEDICAL_DOCUMENT" || text.includes("NOT_MEDICAL_DOCUMENT")) {
      return Response.json({ error: "Not a medical document" }, { status: 400 });
    }
    if (text.length < 30) {
      return Response.json({ error: "Couldn't read enough text. Try a clearer photo." }, { status: 400 });
    }
    return Response.json({ text });
  } catch (e) {
    console.error("Extract error:", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export const maxDuration = 30;
