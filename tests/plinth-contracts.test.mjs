import assert from "node:assert/strict";
import test from "node:test";

import {
  PlinthShapeError,
  auditEvidence,
  parseDecisionContract,
  parseDiscovery,
  suggestEvidenceSelection,
} from "../lib/plinth-contracts.ts";

const contract = parseDecisionContract({
  decisionStatement: "Choose one of three strategic paths.",
  acceptanceCriteria: [
    { id: "AC-01", criterion: "Compare the paths", verification: "A comparison exists" },
    { id: "AC-02", criterion: "Stay within budget", verification: "A capital plan exists" },
    { id: "AC-03", criterion: "Meet the return window", verification: "A return model exists" },
  ],
  constraints: ["A fixed budget"],
  nonGoals: ["Selecting implementation vendors"],
  assumptions: [
    { id: "A-01", claim: "The paths are mutually exclusive", falsifier: "Leadership combines paths" },
    { id: "A-02", claim: "The deadline is fixed", falsifier: "Leadership changes the deadline" },
  ],
  decisionAuthority: "Leadership",
  reviewTrigger: "A path or constraint changes",
  strategicPaths: [
    { id: "P-01", name: "Enter the UK", description: "Build a UK operation" },
    { id: "P-02", name: "Acquire", description: "Acquire a regional competitor" },
    { id: "P-03", name: "Deepen payments", description: "Invest in the US payments product" },
  ],
  evidenceRequirements: [
    { id: "ER-01", pathId: "P-01", question: "Can the UK path work?", evidenceNeeded: "UK market and operating evidence", disconfirmingEvidence: "Localization makes the return case fail", criterionIds: ["AC-01", "AC-03"] },
    { id: "ER-02", pathId: "P-02", question: "Is there an acquirable target?", evidenceNeeded: "Target and valuation evidence", disconfirmingEvidence: "No target fits the budget", criterionIds: ["AC-01", "AC-02"] },
    { id: "ER-03", pathId: "P-03", question: "Can payments create the return?", evidenceNeeded: "Product and unit-economic evidence", disconfirmingEvidence: "Adoption cannot recover the investment", criterionIds: ["AC-01", "AC-03"] },
  ],
}, "v1");

function competitor(overrides = {}) {
  return {
    name: "Example",
    relationship: "Direct",
    relevance: "Tests the decision from a relevant market position.",
    signals: ["A current public signal"],
    sources: ["https://example.com/source"],
    sourceType: "Primary",
    coverage: [{ requirementId: "ER-01", stance: "Supports", explanation: "Provides direct evidence" }],
    ...overrides,
  };
}

test("accepts a complete discovery response", () => {
  const result = parseDiscovery({
    frame: "The strategic frame",
    competitors: [competitor(), competitor({ name: "Two" }), competitor({ name: "Three" }), competitor({ name: "Four" })],
  }, contract);

  assert.equal(result.competitors.length, 4);
  assert.equal(result.competitors[0].name, "Example");
});

test("rejects non-string fields before React can render them", () => {
  assert.throws(
    () => parseDiscovery({
      frame: "The strategic frame",
      competitors: [competitor({ name: { unexpected: true } }), competitor(), competitor(), competitor()],
    }, contract),
    (error) => error instanceof PlinthShapeError && error.message.includes("competitors[0].name"),
  );
});

test("rejects incomplete collections before the UI changes stages", () => {
  assert.throws(
    () => parseDiscovery({ frame: "The strategic frame", competitors: [competitor()] }, contract),
    (error) => error instanceof PlinthShapeError && error.message.includes("research result.competitors"),
  );
});

test("does not treat a competitor count as balanced evidence coverage", () => {
  const biased = [competitor(), competitor({ name: "Two" }), competitor({ name: "Three" }), competitor({ name: "Four" })];
  const audit = auditEvidence(contract, biased);

  assert.equal(audit.ready, false);
  assert.deepEqual(audit.missingRequirementIds, ["ER-02", "ER-03"]);
  assert.equal(audit.paths.find((item) => item.path.id === "P-02")?.state, "Missing");
});

test("context alone does not close a frozen evidence requirement", () => {
  const audit = auditEvidence(contract, [
    competitor({ coverage: [{ requirementId: "ER-02", stance: "Context", explanation: "Background only" }] }),
  ]);

  assert.deepEqual(audit.missingRequirementIds, ["ER-01", "ER-02", "ER-03"]);
});

test("clears the gate only when every path has supporting or challenging evidence", () => {
  const evidence = [
    competitor(),
    competitor({ name: "Target", relationship: "Candidate", coverage: [{ requirementId: "ER-02", stance: "Challenges", explanation: "The valuation exceeds the budget" }] }),
    competitor({ name: "Payments", coverage: [{ requirementId: "ER-03", stance: "Supports", explanation: "Provides product economics" }] }),
  ];
  const audit = auditEvidence(contract, evidence);

  assert.equal(audit.ready, true);
  assert.equal(audit.coveredCount, 3);
  assert.equal(audit.requirements.find((item) => item.requirement.id === "ER-02")?.state, "Contested");
});

test("suggests a compact evidence set that covers the mandate", () => {
  const evidence = [
    competitor(),
    competitor({ name: "Duplicate UK" }),
    competitor({ name: "Target", coverage: [{ requirementId: "ER-02", stance: "Supports", explanation: "Provides target evidence" }] }),
    competitor({ name: "Payments", coverage: [{ requirementId: "ER-03", stance: "Supports", explanation: "Provides payments evidence" }] }),
  ];

  assert.deepEqual(suggestEvidenceSelection(contract, evidence), [0, 2, 3]);
});
