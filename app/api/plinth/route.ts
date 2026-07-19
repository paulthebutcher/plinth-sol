import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const DISCOVERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    frame: { type: "string" },
    competitors: {
      type: "array", minItems: 4, maxItems: 8,
      items: { type: "object", additionalProperties: false, properties: {
        name: { type: "string" }, relationship: { type: "string", enum: ["Direct", "Adjacent", "Analog"] },
        relevance: { type: "string" }, signals: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        sources: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
      }, required: ["name", "relationship", "relevance", "signals", "sources"] },
    },
  }, required: ["frame", "competitors"],
};

const ANALYSIS_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    reframe: { type: "string" }, disagreement: { type: "string" },
    postures: { type: "array", minItems: 3, maxItems: 4, items: { type: "object", additionalProperties: false, properties: {
      name: { type: "string" }, mode: { type: "string" }, thesis: { type: "string" }, optimizes: { type: "string" },
      givesUp: { type: "string" }, support: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", additionalProperties: false, properties: { claim: { type: "string" }, source: { type: "string" } }, required: ["claim", "source"] } },
      assumptions: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      counterevidence: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } }, nextTest: { type: "string" },
    }, required: ["name", "mode", "thesis", "optimizes", "givesUp", "support", "assumptions", "counterevidence", "nextTest"] } },
    unresolved: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
  }, required: ["reframe", "disagreement", "postures", "unresolved"],
};

function readOutput(response: any) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text") return content.text;
  throw new Error("The model returned no structured output.");
}

async function callOpenAI(apiKey: string, prompt: string, schema: object, name: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5.6-terra",
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      reasoning: { effort: "medium" },
      instructions: "You are a skeptical strategy analyst. Research current public evidence. Preserve the decision maker's agency: produce defensible alternatives, never rank them, never declare a winner. Separate supplied context from external evidence. Use exact URLs from your web research as sources. Prefer company pages, filings, documentation, reputable reporting, and customer evidence. If evidence is weak, say so.",
      input: prompt,
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? "OpenAI request failed.");
  return JSON.parse(readOutput(data));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Live research is not configured." }, { status: 503 });
    if (body.action === "discover") {
      const result = await callOpenAI(apiKey, `Decision: ${body.decision}\nCompany: ${body.company}\nWhat it does: ${body.description}\nContext supplied by decision maker: ${body.context}\n\nResearch the competitive landscape relevant to this specific decision. Include direct competitors, adjacent alternatives, and useful analogs. Do not merely list famous companies.`, DISCOVERY_SCHEMA, "competitor_discovery");
      return NextResponse.json(result);
    }
    if (body.action === "analyze") {
      const result = await callOpenAI(apiKey, `Decision: ${body.decision}\nCompany: ${body.company}\nWhat it does: ${body.description}\nContext supplied by decision maker: ${body.context}\nSelected competitive evidence:\n${JSON.stringify(body.competitors)}\n\nResearch these selected companies more deeply. Create 3 or 4 genuinely distinct strategic postures. Each must expose what it optimizes, willingly gives up, supporting evidence with URLs, assumptions, counterevidence, and the cheapest next test. The postures must not be cosmetic variations.`, ANALYSIS_SCHEMA, "decision_brief");
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed." }, { status: 500 });
  }
}
