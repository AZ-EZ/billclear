import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function POST(req) {
  try {
    const { prompt, maxTokens = 1200 } = await req.json();
    if (!prompt || prompt.length > 30000) {
      return Response.json({ error: "Bad input" }, { status: 400 });
    }
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    });
    const text = msg.content.find(b => b.type === "text")?.text || "";
    return Response.json({ text });
  } catch (e) {
    console.error("Analyze error:", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
