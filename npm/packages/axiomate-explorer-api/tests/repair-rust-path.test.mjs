import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { once } from "node:events";

process.env.NODE_ENV = "test";
process.env.AXIOMATE_USE_RUST_CORE = "1";
const { createAppServer } = await import("../dist/server.js");

test("repairs use Rust-required mode with idempotency", async () => {
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

  const docText = [
    "Agile conflicts with Waterfall.",
    "Waterfall conflicts with Agile.",
    "Process is a type of Discipline.",
    "Discipline is a type of Process.",
  ].join(" ");

  const uploadRes = await fetch(`${base}/sessions/${session.sessionId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "conflicts.md",
      mediaType: "text/markdown",
      contentBase64: Buffer.from(docText, "utf8").toString("base64"),
    }),
  });
  assert.equal(uploadRes.status, 201);

  const extractRes = await fetch(`${base}/sessions/${session.sessionId}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxConcepts: 100 }),
  });
  assert.equal(extractRes.status, 202);

  const validateRes = await fetch(`${base}/sessions/${session.sessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });
  assert.equal(validateRes.status, 200);
  const validation = await validateRes.json();

  assert.ok(validation.conflicts.length > 0, "expected at least one conflict before repair");

  const repairPayload = {
    conflictId: validation.conflicts[0].conflictId,
    actionType:
      validation.conflicts[0].code === "RECIPROCAL_SUBSUMPTION" ? "reverse_edge" : "quarantine_relation",
  };

  const repair1 = await fetch(`${base}/sessions/${session.sessionId}/repairs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": `same-${repairPayload.conflictId}`,
    },
    body: JSON.stringify(repairPayload),
  });
  assert.equal(repair1.status, 200);
  const repairRun1 = await repair1.json();

  const repair2 = await fetch(`${base}/sessions/${session.sessionId}/repairs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": `same-${repairPayload.conflictId}`,
    },
    body: JSON.stringify(repairPayload),
  });
  assert.equal(repair2.status, 200);
  const repairRun2 = await repair2.json();

  assert.equal(repairRun1.runId, repairRun2.runId, "idempotency key should replay the first repair run");
  assert.equal(repairRun1.runVersion, repairRun2.runVersion, "idempotent response should be identical");

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => {
      if (err) rejectClose(err);
      else resolveClose(undefined);
    });
  });
});
