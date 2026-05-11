import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { once } from "node:events";

process.env.NODE_ENV = "test";
process.env.AXIOMATE_USE_RUST_CORE = "1";
process.env.AXIOMATE_RUST_CORE_BIN = "definitely-not-a-real-axiomate-bin";
process.env.AXIOMATE_RUST_CORE_TIMEOUT_MS = "1000";
const { createAppServer } = await import("../dist/server.js");

test("rust-required mode returns actionable adapter diagnostics on spawn failure", async () => {
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

  const docText = "Risk Management requires Planning.";
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

  const validateRes = await fetch(`${base}/sessions/${session.sessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });

  assert.equal(validateRes.status, 500);
  const body = await validateRes.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.match(body.error.message, /Failed to start Rust core validate/);
  assert.match(body.error.message, /definitely-not-a-real-axiomate-bin/);

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => {
      if (err) rejectClose(err);
      else resolveClose(undefined);
    });
  });
});
