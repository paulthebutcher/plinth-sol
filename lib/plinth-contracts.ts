export type Competitor = {
  name: string;
  relationship: "Direct" | "Adjacent" | "Analog" | "Candidate";
  relevance: string;
  signals: string[];
  sources: string[];
  sourceType: "Primary" | "Customer" | "Independent" | "Regulatory" | "Market data";
  coverage: EvidenceCoverage[];
};

export type EvidenceCoverage = {
  requirementId: string;
  stance: "Supports" | "Challenges" | "Context";
  explanation: string;
};

export type StrategicPath = { id: string; name: string; description: string };

export type EvidenceRequirement = {
  id: string;
  pathId: string;
  question: string;
  evidenceNeeded: string;
  disconfirmingEvidence: string;
  criterionIds: string[];
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
  strategicPaths: StrategicPath[];
  evidenceRequirements: EvidenceRequirement[];
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

export type CoverageAudit = {
  ready: boolean;
  coveredCount: number;
  totalCount: number;
  missingRequirementIds: string[];
  requirements: Array<{
    requirement: EvidenceRequirement;
    state: "Covered" | "Contested" | "Missing";
    evidenceNames: string[];
  }>;
  paths: Array<{
    path: StrategicPath;
    coveredCount: number;
    totalCount: number;
    state: "Covered" | "Partial" | "Missing";
  }>;
};

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

function requireUnique(values: string[], path: string) {
  if (new Set(values).size !== values.length) throw new PlinthShapeError(path);
}

function deduplicateCoverage(coverage: EvidenceCoverage[]): EvidenceCoverage[] {
  const merged = new Map<string, EvidenceCoverage>();
  const stancePriority = { Context: 0, Supports: 1, Challenges: 2 } as const;

  for (const item of coverage) {
    const existing = merged.get(item.requirementId);
    if (!existing) {
      merged.set(item.requirementId, item);
      continue;
    }

    // A source can legitimately contain both confirming and cautionary material.
    // Preserve the more conservative reading rather than rejecting the whole run.
    const stance = stancePriority[item.stance] > stancePriority[existing.stance]
      ? item.stance
      : existing.stance;
    const explanations = [...new Set([existing.explanation, item.explanation])];
    merged.set(item.requirementId, {
      requirementId: item.requirementId,
      stance,
      explanation: explanations.join(" "),
    });
  }

  return [...merged.values()];
}

export function parseDecisionContract(value: unknown, fallbackVersion?: string): DecisionContract {
  const input = record(value, "decision contract");
  const result: DecisionContract = {
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
    strategicPaths: list(
      input.strategicPaths,
      "decision contract.strategicPaths",
      (item, path) => {
        const entry = record(item, path);
        return {
          id: text(entry.id, `${path}.id`),
          name: text(entry.name, `${path}.name`),
          description: text(entry.description, `${path}.description`),
        };
      },
      { min: 2, max: 4 },
    ),
    evidenceRequirements: list(
      input.evidenceRequirements,
      "decision contract.evidenceRequirements",
      (item, path) => {
        const entry = record(item, path);
        return {
          id: text(entry.id, `${path}.id`),
          pathId: text(entry.pathId, `${path}.pathId`),
          question: text(entry.question, `${path}.question`),
          evidenceNeeded: text(entry.evidenceNeeded, `${path}.evidenceNeeded`),
          disconfirmingEvidence: text(entry.disconfirmingEvidence, `${path}.disconfirmingEvidence`),
          criterionIds: textList(entry.criterionIds, `${path}.criterionIds`, { min: 1, max: 4 }),
        };
      },
      { min: 3, max: 12 },
    ),
  };

  const criterionIds = result.acceptanceCriteria.map((item) => item.id);
  const pathIds = result.strategicPaths.map((item) => item.id);
  const requirementIds = result.evidenceRequirements.map((item) => item.id);
  requireUnique(criterionIds, "decision contract.acceptanceCriteria ids");
  requireUnique(pathIds, "decision contract.strategicPaths ids");
  requireUnique(requirementIds, "decision contract.evidenceRequirements ids");
  const criterionSet = new Set(criterionIds);
  const pathSet = new Set(pathIds);
  for (const requirement of result.evidenceRequirements) {
    if (!pathSet.has(requirement.pathId) || requirement.criterionIds.some((id) => !criterionSet.has(id))) {
      throw new PlinthShapeError(`decision contract.evidenceRequirements.${requirement.id}`);
    }
  }
  for (const path of result.strategicPaths) {
    if (!result.evidenceRequirements.some((requirement) => requirement.pathId === path.id)) {
      throw new PlinthShapeError(`decision contract.strategicPaths.${path.id}.evidenceRequirements`);
    }
  }
  return result;
}

function parseCompetitor(value: unknown, path: string): Competitor {
  const entry = record(value, path);
  return {
    name: text(entry.name, `${path}.name`),
    relationship: choice(
      entry.relationship,
      `${path}.relationship`,
      ["Direct", "Adjacent", "Analog", "Candidate"] as const,
    ),
    relevance: text(entry.relevance, `${path}.relevance`),
    signals: textList(entry.signals, `${path}.signals`, { min: 1, max: 3 }),
    sources: textList(entry.sources, `${path}.sources`, { min: 1, max: 4 }),
    sourceType: choice(
      entry.sourceType,
      `${path}.sourceType`,
      ["Primary", "Customer", "Independent", "Regulatory", "Market data"] as const,
    ),
    coverage: deduplicateCoverage(list(
      entry.coverage,
      `${path}.coverage`,
      (coverageItem, coveragePath) => {
        const coverage = record(coverageItem, coveragePath);
        return {
          requirementId: text(coverage.requirementId, `${coveragePath}.requirementId`),
          stance: choice(
            coverage.stance,
            `${coveragePath}.stance`,
            ["Supports", "Challenges", "Context"] as const,
          ),
          explanation: text(coverage.explanation, `${coveragePath}.explanation`),
        };
      },
      { min: 1, max: 6 },
    )),
  };
}

function validateCoverage(competitors: Competitor[], contract: DecisionContract) {
  const requirementIds = new Set(contract.evidenceRequirements.map((item) => item.id));
  for (const competitor of competitors) {
    if (competitor.coverage.some((item) => !requirementIds.has(item.requirementId))) {
      throw new PlinthShapeError(`research result.competitors.${competitor.name}.coverage`);
    }
  }
}

export function parseDiscovery(value: unknown, contract?: DecisionContract): Discovery {
  const input = record(value, "research result");
  const result = {
    frame: text(input.frame, "research result.frame"),
    competitors: list(
      input.competitors,
      "research result.competitors",
      parseCompetitor,
      { min: 4, max: 8 },
    ),
  };
  if (contract) validateCoverage(result.competitors, contract);
  return result;
}

export function parseEvidenceSelection(value: unknown, contract: DecisionContract): Competitor[] {
  const competitors = list(value, "selected evidence", parseCompetitor, { min: 1, max: 20 });
  validateCoverage(competitors, contract);
  return competitors;
}

export function auditEvidence(contract: DecisionContract, competitors: Competitor[]): CoverageAudit {
  const requirements = contract.evidenceRequirements.map((requirement) => {
    const matches = competitors.filter((competitor) => competitor.coverage.some(
      (coverage) => coverage.requirementId === requirement.id && coverage.stance !== "Context",
    ));
    const stances = matches.flatMap((competitor) => competitor.coverage
      .filter((coverage) => coverage.requirementId === requirement.id)
      .map((coverage) => coverage.stance));
    const state = matches.length === 0
      ? "Missing" as const
      : stances.includes("Challenges")
        ? "Contested" as const
        : "Covered" as const;
    return { requirement, state, evidenceNames: matches.map((item) => item.name) };
  });
  const coveredCount = requirements.filter((item) => item.state !== "Missing").length;
  const paths = contract.strategicPaths.map((path) => {
    const pathRequirements = requirements.filter((item) => item.requirement.pathId === path.id);
    const pathCoveredCount = pathRequirements.filter((item) => item.state !== "Missing").length;
    return {
      path,
      coveredCount: pathCoveredCount,
      totalCount: pathRequirements.length,
      state: pathCoveredCount === pathRequirements.length
        ? "Covered" as const
        : pathCoveredCount === 0
          ? "Missing" as const
          : "Partial" as const,
    };
  });
  return {
    ready: coveredCount === requirements.length,
    coveredCount,
    totalCount: requirements.length,
    missingRequirementIds: requirements
      .filter((item) => item.state === "Missing")
      .map((item) => item.requirement.id),
    requirements,
    paths,
  };
}

export function suggestEvidenceSelection(
  contract: DecisionContract,
  competitors: Competitor[],
  limit = 6,
): number[] {
  const selected: number[] = [];
  const uncovered = new Set(contract.evidenceRequirements.map((item) => item.id));
  while (selected.length < limit && uncovered.size) {
    let bestIndex = -1;
    let bestCoverage = 0;
    competitors.forEach((competitor, index) => {
      if (selected.includes(index)) return;
      const coverage = new Set(competitor.coverage
        .filter((item) => item.stance !== "Context" && uncovered.has(item.requirementId))
        .map((item) => item.requirementId)).size;
      if (coverage > bestCoverage) {
        bestIndex = index;
        bestCoverage = coverage;
      }
    });
    if (bestIndex < 0) break;
    selected.push(bestIndex);
    competitors[bestIndex].coverage.forEach((item) => {
      if (item.stance !== "Context") uncovered.delete(item.requirementId);
    });
  }
  if (!selected.length) return competitors.slice(0, Math.min(4, competitors.length)).map((_, index) => index);
  return selected;
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
