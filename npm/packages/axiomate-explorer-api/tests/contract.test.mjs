import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("OpenAPI contract exposes day-1 endpoints", () => {
  const root = resolve(process.cwd(), "..", "..", "..");
  const openapiPath = resolve(root, "Axiomate", "contracts", "openapi.yaml");
  const content = readFileSync(openapiPath, "utf8");

  assert.match(content, /\/sessions:/);
  assert.match(content, /\/sessions\/\{sessionId\}\/documents:/);
  assert.match(content, /\/sessions\/\{sessionId\}\/extract:/);
  assert.match(content, /\/sessions\/\{sessionId\}\/graph:/);
});
