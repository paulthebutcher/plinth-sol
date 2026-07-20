import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const CONTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    decisionStatement: { type: "string" },
    acceptanceCriteria: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          criterion: { type: "string" },
          verification: { type: "string" },
        },
        required: ["id", "criterion", "verification"],
      },
    },
    constraints: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
    nonGoals: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
    assumptions: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          claim: { type: "string" },
          falsifier: { type: "string" },
        },
        required: ["id", "claim", "falsifier"],
      },
    },
    decisionAuthority: { type: "string" },
    reviewTrigger: { type: "string" },
  },
  required: [
    "decisionStatement",
    "acceptanceCriteria",
    "constraints",
    "nonGoals",
    "assumptions",
    "decisionAuthority",
    "reviewTrigger",
  ],
};

const DISCOVERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    frame: { type: "string" },
    competitors: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          relationship: { type: "string", enum: ["Direct", "Adjacent", "Analog"] },
          relevance: { type: "string" },
          signals: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
          sources: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        },
        required: ["name", "relationship", "relevance", "signals", "sources"],
      },
    },
  },
  required: ["frame", "competitors"],
};

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reframe: { type: "string" },
    disagreement: { type: "string" },
    postures: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          mode: { type: "string" },
          thesis: { type: "string" },
          optimizes: { type: "string" },
          givesUp: { type: "string" },
          support: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                claim: { type: "string" },
                source: { type: "string" },
                epistemicState: {
                  type: "string",
                  enum: ["Evidence-supported", "Contested", "Unknown"],
                },
              },
              required: ["id", "claim", "source", "epistemicState"],
            },
          },
          assumptions: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
          counterevidence: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
          criteriaCoverage: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                criterionId: { type: "string" },
                fit: { type: "string", enum: ["Supports", "Tensions", "Unknown"] },
                explanation: { type: "string" },
              },
              required: ["criterionId", "fit", "explanation"],
            },
          },
          nextTest: { type: "string" },
        },
        required: [
          "name",
          "mode",
          "thesis",
          "optimizes",
          "givesUp",
          "support",
          "assumptions",
          "counterevidence",
          "criteriaCoverage",
          "nextTest",
        ],
      },
    },
    unresolved: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
  },
  required: ["reframe", "disagreement", "postures", "unresolved"],
};

type CallOptions = {
  webSearch?: boolean;
  instructions: string;
};

function readOutput(response: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("The model returned no structured output.");
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
  schema: object,
  name: string,
  options: CallOptions,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5.6-terra",
      ...(options.webSearch ? { tools: [{ type: "web_search" }], tool_choice: "auto" } : {}),
      reasoning: { effort: "medium" },
      instructions: options.instructions,
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
    if (!apiKey) {
      return NextResponse.json({ error: "Live research is not configured." }, { status: 503 });
    }

    if (body.action === "contract") {
      const result = await callOpenAI(
        apiKey,
        `Decision-maker input:\n${body.decision}\n\nCompany: ${body.company}\nWhat it does: ${body.description}\nAdditional context: ${body.context}\n\nDistill this into a decision contract. Number criteria AC-01 onward and assumptions A-01 onward. Verification must describe observable evidence, not a confidence score. State missing authority as Unspecified.`,
        CONTRACT_SCHEMA,
        "decision_contract",
        {
          instructions:
            "You are the Distiller. Convert thin human intent into a precise decision contract. You may clarify and structure only what was supplied. You must not research, recommend an option, invent organizational facts, or resolve uncertainty. Keep hypotheses explicitly labeled as assumptions with concrete falsifiers.",
        },
      );
      return NextResponse.json({ version: "v1", ...result });
    }

    if (body.action === "discover") {
      const result = await callOpenAI(
        apiKey,
        `Frozen decision contract (do not alter):\n${JSON.stringify(body.contract)}\n\nResearch the competitive landscape relevant to this exact contract. Include direct competitors, adjacent alternatives, and useful analogs. Do not merely list famous companies.`,
        DISCOVERY_SCHEMA,
        "competitor_discovery",
        {
          webSearch: true,
          instructions:
            "You are the Researcher. Gather current public evidence against the frozen decision contract. You cannot change its criteria, assumptions, constraints, or authority, and you cannot recommend or rank an option. Use exact URLs from research. Prefer company pages, filings, documentation, reputable reporting, and customer evidence. If evidence is weak, say so.",
        },
      );
      return NextResponse.json(result);
    }

    if (body.action === "analyze") {
      const result = await callOpenAI(
        apiKey,
        `Frozen decision contract (do not alter):\n${JSON.stringify(body.contract)}\n\nHuman-selected research set:\n${JSON.stringify(body.competitors)}\n\nResearch these selections more deeply. Create 3 or 4 genuinely distinct strategic postures. For each posture, map every acceptance criterion to Supports, Tensions, or Unknown. Give evidence stable IDs E1 onward, exact source URLs, and an epistemic state. Expose assumptions, counterevidence, and the cheapest falsification test.`,
        ANALYSIS_SCHEMA,
        "decision_brief",
        {
          webSearch: true,
          instructions:
            "You are the Analyst. Evaluate distinct postures against a frozen contract and cited current evidence. You cannot change the contract, suppress contradictions, rank postures, declare a winner, or turn supplied context into proof. Preserve hypotheses as assumptions. Unknown means unknown.",
        },
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 },
    );
  }
}
