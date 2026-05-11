import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

process.env.NODE_ENV = "test";
process.env.AXIOMATE_USE_RUST_CORE = "0";
const { createAppServer } = await import("../dist/server.js");

test("error envelope includes optional details when relevant", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server port");
  }

  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const invalidFormatRes = await fetch(`${base}/sessions/does-not-matter/export?format=bad`);
  assert.equal(invalidFormatRes.status, 400);
  const invalidFormatBody = await invalidFormatRes.json();
  assert.equal(invalidFormatBody.error.code, "INVALID_FORMAT");
  assert.ok(Array.isArray(invalidFormatBody.error.details.allowedFormats));

  const missingRouteRes = await fetch(`${base}/missing-route`);
  assert.equal(missingRouteRes.status, 404);
  const missingRouteBody = await missingRouteRes.json();
  assert.equal(missingRouteBody.error.code, "NOT_FOUND");
  assert.equal(typeof missingRouteBody.error.message, "string");
  assert.equal("details" in missingRouteBody.error, false);

  await new Promise((resolveClose, rejectClose) => {
    server.close((err) => {
      if (err) rejectClose(err);
      else resolveClose(undefined);
    });
  });
});
