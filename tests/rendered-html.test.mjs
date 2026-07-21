import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Plinth decision studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Plinth — See the decision before you make it<\/title>/i);
  assert.match(html, /Describe the decision/i);
  assert.match(html, /Live research is included/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("encodes separation of powers in the analysis endpoint", async () => {
  const route = await readFile(new URL("../app/api/plinth/route.ts", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/plinth-studio.tsx", import.meta.url), "utf8");

  assert.match(route, /You are the Distiller/);
  assert.match(route, /You are the Researcher/);
  assert.match(route, /You are the Analyst/);
  assert.match(route, /Frozen decision contract \(do not alter\)/);
  assert.match(route, /auditEvidence/);
  assert.match(route, /explicitly build a provisional brief/);
  assert.match(studio, /Reasoning is part of the deliverable/);
  assert.match(studio, /EVIDENCE READINESS · DETERMINISTIC GATE/);
  assert.match(studio, /Research missing evidence/);
  assert.match(studio, /Prepare execution packet/);
});
