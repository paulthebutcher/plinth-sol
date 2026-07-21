import { NextRequest, NextResponse } from "next/server";
import {
  auditEvidence,
  parseBrief,
  parseDecisionContract,
  parseDiscovery,
  parseEvidenceSelection,
} from "@/lib/plinth-contracts";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    strategicPaths: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["id", "name", "description"],
      },
    },
    evidenceRequirements: {
      type: "array",
      minItems: 3,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          pathId: { type: "string" },
          question: { type: "string" },
          evidenceNeeded: { type: "string" },
          disconfirmingEvidence: { type: "string" },
          criterionIds: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
        },
        required: ["id", "pathId", "question", "evidenceNeeded", "disconfirmingEvidence", "criterionIds"],
      },
    },
  },
  required: [
    "decisionStatement",
    "acceptanceCriteria",
    "constraints",
    "nonGoals",
    "assumptions",
    "decisionAuthority",
    "reviewTrigger",
    "strategicPaths",
    "evidenceRequirements",
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
          relationship: { type: "string", enum: ["Direct", "Adjacent", "Analog", "Candidate"] },
          relevance: { type: "string" },
          signals: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
          sources: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          sourceType: {
            type: "string",
            enum: ["Primary", "Customer", "Independent", "Regulatory", "Market data"],
          },
          coverage: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                requirementId: { type: "string" },
                stance: { type: "string", enum: ["Supports", "Challenges", "Context"] },
                explanation: { type: "string" },
              },
              required: ["requirementId", "stance", "explanation"],
            },
          },
        },
        required: ["name", "relationship", "relevance", "signals", "sources", "sourceType", "coverage"],
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
  reasoningEffort?: "low" | "medium";
  instructions: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOutput(response: unknown) {
  if (!isRecord(response)) throw new Error("The model returned an unreadable response.");
  if (typeof response.output_text === "string" && response.output_text) return response.output_text;
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (isRecord(content) && content.type === "output_text" && typeof content.text === "string" && content.text) {
          return content.text;
        }
      }
    }
  }
  throw new Error("The model returned no structured output.");
}

function upstreamError(data: unknown, status: number) {
  if (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") {
    return data.error.message;
  }
  return `The research provider returned an error (${status}). Please try again.`;
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
  schema: object,
  name: string,
  options: CallOptions,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6-terra",
        ...(options.webSearch ? { tools: [{ type: "web_search" }], tool_choice: "auto" } : {}),
        reasoning: { effort: options.reasoningEffort ?? "medium" },
        instructions: options.instructions,
        input: prompt,
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`The research provider returned an unreadable response (${response.status}). Please try again.`);
    }
    if (!response.ok) throw new Error(upstreamError(data, response.status));

    try {
      return JSON.parse(readOutput(data));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("The model returned invalid structured output. Please try again.");
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Live research took too long. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "The request body must be a JSON object." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Live research is not configured." }, { status: 503 });
    }

    if (body.action === "contract") {
      const result = await callOpenAI(
        apiKey,
        `Decision-maker input:\n${body.decision}\n\nCompany: ${body.company}\nWhat it does: ${body.description}\nAdditional context: ${body.context}\n\nDistill this into a decision contract. Number criteria AC-01 onward and assumptions A-01 onward. Identify 2–4 materially distinct strategic paths as P-01 onward. For every path, define the smallest set of decision-relevant research questions as evidence requirements ER-01 onward; map each requirement to one path and the acceptance criteria it tests. Include what evidence would answer the question and what evidence would disconfirm the favorable case. Verification and evidence requirements must describe observable evidence, not confidence scores. State missing authority as Unspecified.`,
        CONTRACT_SCHEMA,
        "decision_contract",
        {
          instructions:
            "You are the Distiller. Convert thin human intent into a precise decision contract and a balanced research mandate. You may clarify and structure only what was supplied. You must not research, recommend an option, invent organizational facts, or resolve uncertainty. Keep hypotheses explicitly labeled as assumptions with concrete falsifiers. Give every strategic path at least one evidence requirement. The mandate must ask what could falsify each path, not merely what could support it.",
        },
      );
      return NextResponse.json(parseDecisionContract(result, "v1"));
    }

    if (body.action === "discover") {
      const contract = parseDecisionContract(body.contract);
      const requestedFocus = Array.isArray(body.focusRequirementIds)
        ? body.focusRequirementIds.filter((item): item is string => typeof item === "string")
        : [];
      const validRequirementIds = new Set(contract.evidenceRequirements.map((item) => item.id));
      if (requestedFocus.some((id) => !validRequirementIds.has(id))) {
        return NextResponse.json({ error: "Gap research referenced an unknown evidence requirement." }, { status: 400 });
      }
      const mandate = requestedFocus.length
        ? contract.evidenceRequirements.filter((item) => requestedFocus.includes(item.id))
        : contract.evidenceRequirements;
      const result = await callOpenAI(
        apiKey,
        `Frozen decision contract (do not alter):\n${JSON.stringify(contract)}\n\nEvidence requirements to research in this pass:\n${JSON.stringify(mandate)}\n\nResearch the landscape relevant to these exact requirements. Include direct competitors, adjacent alternatives, useful analogs, acquisition candidates when the path requires them, and non-company evidence such as regulatory, market, or financial sources when necessary. Do not merely list famous companies. For each perspective, tag only the ER IDs that its cited evidence genuinely addresses, and include each ER ID at most once. If one source has both favorable and cautionary evidence for an ER, tag it Challenges and state the tension. Context does not close an evidence gap.`,
        DISCOVERY_SCHEMA,
        "competitor_discovery",
        {
          webSearch: true,
          reasoningEffort: "low",
          instructions:
            "You are the Researcher. Gather current public evidence against the frozen decision contract and its research mandate. You cannot change its paths, criteria, assumptions, constraints, requirements, or authority, and you cannot recommend or rank an option. Use exact requirement IDs and exact source URLs. Prefer primary company materials, filings, regulatory sources, reputable independent reporting, market data, and customer evidence. Tag evidence as Supports, Challenges, or Context. Context never counts as proof. If a requirement cannot be covered, do not fabricate a mapping.",
        },
      );
      return NextResponse.json(parseDiscovery(result, contract));
    }

    if (body.action === "analyze") {
      const contract = parseDecisionContract(body.contract);
      const competitors = parseEvidenceSelection(body.competitors, contract);
      const coverageAudit = auditEvidence(contract, competitors);
      const provisional = body.provisional === true;
      if (!coverageAudit.ready && !provisional) {
        return NextResponse.json(
          { error: "The selected evidence does not cover the frozen research mandate. Research the gaps or explicitly build a provisional brief." },
          { status: 409 },
        );
      }
      const result = await callOpenAI(
        apiKey,
        `Frozen decision contract (do not alter):\n${JSON.stringify(contract)}\n\nHuman-selected research set:\n${JSON.stringify(competitors)}\n\nDeterministic evidence-coverage audit:\n${JSON.stringify(coverageAudit)}\n\nBrief status: ${provisional ? "PROVISIONAL — readiness was explicitly overridden" : "AUDITED — all mandated evidence questions have coverage"}.\n\nUsing only the selected evidence above, create 3 or 4 genuinely distinct strategic postures. Do not add facts or sources from outside this reviewed set. For each posture, map every acceptance criterion to Supports, Tensions, or Unknown. Give evidence stable IDs E1 onward, preserve the exact selected source URLs, and assign an epistemic state. Expose assumptions, counterevidence, coverage gaps, and the cheapest falsification test. Do not smooth over missing mandate coverage in a provisional brief.`,
        ANALYSIS_SCHEMA,
        "decision_brief",
        {
          instructions:
            "You are the Analyst. Evaluate distinct postures against a frozen contract, a deterministic coverage audit, and the human-selected evidence set. You have no research authority: you cannot add a source, fact, or claim that is absent from the selected set. You cannot change the contract or mandate, certify the evidence set, suppress contradictions, rank postures, declare a winner, or turn supplied context into proof. Preserve hypotheses as assumptions. Unknown means unknown. When the brief is provisional, make the uncovered requirements materially visible in the disagreement, posture tensions, and unresolved questions.",
        },
      );
      return NextResponse.json(parseBrief(result));
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 },
    );
  }
}
