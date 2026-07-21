export type Competitor = {
  name: string;
  relationship: "Direct" | "Adjacent" | "Analog";
  relevance: string;
  signals: string[];
  sources: string[];
};

export type DecisionContract = {
  version: string;
  decisionStatement: string;
  acceptanceCriteria: { id: string; criterion: string; verification: string }[];
  constraints: string[];
  nonGoals: string[];
  assumptions: { id: string; claim: string; falsifier: string }[];
  decisionAuthority: string;
  reviewTrigger: string;
};

export type Posture = {
  name: string;
  mode: string;
  thesis: string;
  optimizes: string;
  givesUp: string;
  support: {
    id: string;
    claim: string;
    source: string;
    epistemicState: "Evidence-supported" | "Contested" | "Unknown";
  }[];
  assumptions: string[];
  counterevidence: string[];
  criteriaCoverage: {
    criterionId: string;
    fit: "Supports" | "Tensions" | "Unknown";
    explanation: string;
  }[];
  nextTest: string;
};

export type Brief = {
  reframe: string;
  disagreement: string;
  postures: Posture[];
  unresolved: string[];
};

export type Discovery = { frame: string; competitors: Competitor[] };

export class PlinthShapeError extends Error {
  constructor(path: string) {
    super(`The analysis service returned an incomplete result at ${path}. Please try again.`);
    this.name = "PlinthShapeError";
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, path: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlinthShapeError(path);
  }
  return value as JsonRecord;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new PlinthShapeError(path);
  return value;
}

function list<T>(
  value: unknown,
  path: string,
  parse: (item: unknown, path: string) => T,
  bounds?: { min?: number; max?: number },
): T[] {
  if (
    !Array.isArray(value) ||
    (bounds?.min !== undefined && value.length < bounds.min) ||
    (bounds?.max !== undefined && value.length > bounds.max)
  ) {
    throw new PlinthShapeError(path);
  }
  return value.map((item, index) => parse(item, `${path}[${index}]`));
}

function textList(value: unknown, path: string, bounds?: { min?: number; max?: number }): string[] {
  return list(value, path, text, bounds);
}

function choice<const T extends readonly string[]>(value: unknown, path: string, allowed: T): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw new PlinthShapeError(path);
  return value as T[number];
}

export function parseDecisionContract(value: unknown, fallbackVersion?: string): DecisionContract {
  const input = record(value, "decision contract");
  return {
    version: fallbackVersion ?? text(input.version, "decision contract.version"),
    decisionStatement: text(input.decisionStatement, "decision contract.decisionStatement"),
    acceptanceCriteria: list(
      input.acceptanceCriteria,
      "decision contract.acceptanceCriteria",
      (item, path) => {
        const entry = record(item, path);
        return {
          id: text(entry.id, `${path}.id`),
          criterion: text(entry.criterion, `${path}.criterion`),
          verification: text(entry.verification, `${path}.verification`),
        };
      },
      { min: 3, max: 6 },
    ),
    constraints: textList(input.constraints, "decision contract.constraints", { min: 1, max: 6 }),
    nonGoals: textList(input.nonGoals, "decision contract.nonGoals", { min: 1, max: 4 }),
    assumptions: list(
      input.assumptions,
      "decision contract.assumptions",
      (item, path) => {
        const entry = record(item, path);
        return {
          id: text(entry.id, `${path}.id`),
          claim: text(entry.claim, `${path}.claim`),
          falsifier: text(entry.falsifier, `${path}.falsifier`),
        };
      },
      { min: 2, max: 6 },
    ),
    decisionAuthority: text(input.decisionAuthority, "decision contract.decisionAuthority"),
    reviewTrigger: text(input.reviewTrigger, "decision contract.reviewTrigger"),
  };
}

export function parseDiscovery(value: unknown): Discovery {
  const input = record(value, "research result");
  return {
    frame: text(input.frame, "research result.frame"),
    competitors: list(
      input.competitors,
      "research result.competitors",
      (item, path) => {
        const entry = record(item, path);
        return {
          name: text(entry.name, `${path}.name`),
          relationship: choice(entry.relationship, `${path}.relationship`, ["Direct", "Adjacent", "Analog"] as const),
          relevance: text(entry.relevance, `${path}.relevance`),
          signals: textList(entry.signals, `${path}.signals`, { min: 1, max: 3 }),
          sources: textList(entry.sources, `${path}.sources`, { min: 1, max: 4 }),
        };
      },
      { min: 4, max: 8 },
    ),
  };
}

export function parseBrief(value: unknown): Brief {
  const input = record(value, "decision brief");
  return {
    reframe: text(input.reframe, "decision brief.reframe"),
    disagreement: text(input.disagreement, "decision brief.disagreement"),
    postures: list(input.postures, "decision brief.postures", (item, path) => {
      const entry = record(item, path);
      return {
        name: text(entry.name, `${path}.name`),
        mode: text(entry.mode, `${path}.mode`),
        thesis: text(entry.thesis, `${path}.thesis`),
        optimizes: text(entry.optimizes, `${path}.optimizes`),
        givesUp: text(entry.givesUp, `${path}.givesUp`),
        support: list(
          entry.support,
          `${path}.support`,
          (supportItem, supportPath) => {
            const support = record(supportItem, supportPath);
            return {
              id: text(support.id, `${supportPath}.id`),
              claim: text(support.claim, `${supportPath}.claim`),
              source: text(support.source, `${supportPath}.source`),
              epistemicState: choice(
                support.epistemicState,
                `${supportPath}.epistemicState`,
                ["Evidence-supported", "Contested", "Unknown"] as const,
              ),
            };
          },
          { min: 2, max: 4 },
        ),
        assumptions: textList(entry.assumptions, `${path}.assumptions`, { min: 2, max: 4 }),
        counterevidence: textList(entry.counterevidence, `${path}.counterevidence`, { min: 1, max: 3 }),
        criteriaCoverage: list(
          entry.criteriaCoverage,
          `${path}.criteriaCoverage`,
          (coverageItem, coveragePath) => {
            const coverage = record(coverageItem, coveragePath);
            return {
              criterionId: text(coverage.criterionId, `${coveragePath}.criterionId`),
              fit: choice(coverage.fit, `${coveragePath}.fit`, ["Supports", "Tensions", "Unknown"] as const),
              explanation: text(coverage.explanation, `${coveragePath}.explanation`),
            };
          },
          { min: 3, max: 6 },
        ),
        nextTest: text(entry.nextTest, `${path}.nextTest`),
      };
    }, { min: 3, max: 4 }),
    unresolved: textList(input.unresolved, "decision brief.unresolved", { min: 3, max: 6 }),
  };
}
