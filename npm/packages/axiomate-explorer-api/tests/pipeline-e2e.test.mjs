import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { once } from "node:events";

process.env.NODE_ENV = "test";
process.env.AXIOMATE_USE_RUST_CORE = "0";
const { createAppServer } = await import("../dist/server.js");

test("happy path: session -> upload -> extract -> graph", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server port");
  }

  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const createRes = await fetch(`${base}/sessions`, { method: "POST" });
  assert.equal(createRes.status, 201);
  const session = await createRes.json();
  assert.ok(session.sessionId);

  const docText = "Risk Management requires Planning. Agile conflicts with Waterfall.";
  const uploadRes = await fetch(`${base}/sessions/${session.sessionId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "sample.md",
      mediaType: "text/markdown",
      contentBase64: Buffer.from(docText, "utf8").toString("base64"),
    }),
  });
  assert.equal(uploadRes.status, 201);

  const extractRes = await fetch(`${base}/sessions/${session.sessionId}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxConcepts: 25 }),
  });
  assert.equal(extractRes.status, 202);

  const graphRes = await fetch(`${base}/sessions/${session.sessionId}/graph`);
  assert.equal(graphRes.status, 200);
  const graph = await graphRes.json();
  assert.ok(Array.isArray(graph.concepts));
  assert.ok(Array.isArray(graph.relations));
  assert.ok(graph.concepts.length > 0);

  const validateRes = await fetch(`${base}/sessions/${session.sessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });
  assert.equal(validateRes.status, 200);
  const validation = await validateRes.json();
  assert.ok(Array.isArray(validation.conflicts));

  const tracesRes = await fetch(`${base}/sessions/${session.sessionId}/traces`);
  assert.equal(tracesRes.status, 200);
  const traces = await tracesRes.json();
  assert.ok(Array.isArray(traces.traces));

  const attestRes = await fetch(`${base}/sessions/${session.sessionId}/attest`, {
    method: "POST",
  });
  assert.equal(attestRes.status, 200);
  const attestation = await attestRes.json();
  assert.ok(attestation.attestationId);

  const verifyRes = await fetch(`${base}/attestations/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ attestation }),
  });
  assert.equal(verifyRes.status, 200);
  const verification = await verifyRes.json();
  assert.equal(verification.valid, true);

  const exportRes = await fetch(`${base}/sessions/${session.sessionId}/export?format=json`);
  assert.equal(exportRes.status, 200);
  const exported = await exportRes.json();
  assert.equal(exported.format, "json");
  assert.ok(exported.artifact.includes("concepts"));

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });
});
