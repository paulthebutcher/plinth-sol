import assert from "node:assert/strict";
import test from "node:test";

import { PlinthShapeError, parseDiscovery } from "../lib/plinth-contracts.ts";

function competitor(overrides = {}) {
  return {
    name: "Example",
    relationship: "Direct",
    relevance: "Tests the decision from a relevant market position.",
    signals: ["A current public signal"],
    sources: ["https://example.com/source"],
    ...overrides,
  };
}

test("accepts a complete discovery response", () => {
  const result = parseDiscovery({
    frame: "The strategic frame",
    competitors: [competitor(), competitor({ name: "Two" }), competitor({ name: "Three" }), competitor({ name: "Four" })],
  });

  assert.equal(result.competitors.length, 4);
  assert.equal(result.competitors[0].name, "Example");
});

test("rejects non-string fields before React can render them", () => {
  assert.throws(
    () => parseDiscovery({
      frame: "The strategic frame",
      competitors: [competitor({ name: { unexpected: true } }), competitor(), competitor(), competitor()],
    }),
    (error) => error instanceof PlinthShapeError && error.message.includes("competitors[0].name"),
  );
});

test("rejects incomplete collections before the UI changes stages", () => {
  assert.throws(
    () => parseDiscovery({ frame: "The strategic frame", competitors: [competitor()] }),
    (error) => error instanceof PlinthShapeError && error.message.includes("research result.competitors"),
  );
});
