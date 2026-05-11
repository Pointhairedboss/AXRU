import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

process.env.NODE_ENV = "test";
process.env.AXIOMATE_USE_RUST_CORE = "0";
const { createAppServer } = await import("../dist/server.js");

const repoRoot = resolve(process.cwd(), "..", "..", "..");

function readFixture(name) {
  return readFileSync(resolve(repoRoot, "tests", "axiomate-explorer", "fixtures", name), "utf8");
}

async function createSession(base) {
  const res = await fetch(`${base}/sessions`, { method: "POST" });
  assert.equal(res.status, 201);
  return res.json();
}

async function uploadAndExtract(base, sessionId, text, maxConcepts = 100) {
  const uploadRes = await fetch(`${base}/sessions/${sessionId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "fixture.md",
      mediaType: "text/markdown",
      contentBase64: Buffer.from(text, "utf8").toString("base64"),
    }),
  });
  assert.equal(uploadRes.status, 201);

  const extractRes = await fetch(`${base}/sessions/${sessionId}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxConcepts }),
  });
  assert.equal(extractRes.status, 202);

  const graphRes = await fetch(`${base}/sessions/${sessionId}/graph`);
  assert.equal(graphRes.status, 200);
  const graph = await graphRes.json();

  const validateRes = await fetch(`${base}/sessions/${sessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });
  assert.equal(validateRes.status, 200);
  const validation = await validateRes.json();

  return { graph, validation };
}

test("fixture thresholds: sample-policy", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to get server address");
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const session = await createSession(base);
  const { graph } = await uploadAndExtract(base, session.sessionId, readFixture("sample-policy.md"), 100);

  assert.ok(graph.concepts.length >= 12, `expected >= 12 concepts, got ${graph.concepts.length}`);
  assert.ok(graph.relations.length >= 4, `expected >= 4 relations, got ${graph.relations.length}`);

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => (err ? rejectClose(err) : resolveClose(undefined)));
  });
});

test("fixture thresholds: sample-swebok", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to get server address");
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const session = await createSession(base);
  const { graph } = await uploadAndExtract(base, session.sessionId, readFixture("sample-swebok.txt"), 100);

  assert.ok(graph.concepts.length >= 18, `expected >= 18 concepts, got ${graph.concepts.length}`);
  assert.ok(graph.relations.length >= 5, `expected >= 5 relations, got ${graph.relations.length}`);
  assert.ok(
    graph.relations.some((relation) => relation.type === "subsumes"),
    "expected at least one subsumes relation"
  );

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => (err ? rejectClose(err) : resolveClose(undefined)));
  });
});

test("fixture thresholds: conflicting-definitions", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to get server address");
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const session = await createSession(base);
  const { validation } = await uploadAndExtract(
    base,
    session.sessionId,
    readFixture("conflicting-definitions.md"),
    100
  );

  assert.ok(
    validation.conflicts.some((conflict) => conflict.severity === "high"),
    "expected at least one high severity conflict"
  );
  assert.ok(validation.suggestedRepairs.length >= 1, "expected at least one repair suggestion");

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => (err ? rejectClose(err) : resolveClose(undefined)));
  });
});
