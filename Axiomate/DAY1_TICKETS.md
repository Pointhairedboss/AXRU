# Axiomate Day-1 Tickets (Ready to Pick Up)

## AX-001 Contract Freeze
- Owner: Backend Lead
- Scope:
  - Confirm `Axiomate/contracts/openapi.yaml` remains `0.1.0` additive-only.
  - Confirm `Axiomate/contracts/mcp-tools.json` tool names and IO schemas.
- Acceptance:
  - Freeze note present.
  - Team signoff recorded in PR.

## AX-002 API Scaffold Boot
- Owner: Backend Engineer A
- Scope:
  - Ensure `npm/packages/axiomate-explorer-api` builds and starts.
  - Verify `/health` and day-1 endpoints are reachable.
- Acceptance:
  - `npm run build` succeeds in package.
  - API listens on `:8787` by default.

## AX-003 Session Endpoint
- Owner: Backend Engineer A
- Scope:
  - `POST /api/v1/sessions` returns `sessionId`, `status`, `createdAt`.
- Acceptance:
  - Response code `201`.
  - Session appears in in-memory store.

## AX-004 Document Upload Endpoint
- Owner: Backend Engineer A
- Scope:
  - `POST /api/v1/sessions/{id}/documents` accepts base64 payload and stores text.
- Acceptance:
  - Response code `201`.
  - `parseStatus` returned and size tracked.

## AX-005 Extraction Endpoint
- Owner: Backend Engineer B
- Scope:
  - `POST /api/v1/sessions/{id}/extract` extracts concepts and relation candidates.
- Acceptance:
  - Response code `202`.
  - Graph snapshot persisted for session.

## AX-006 Graph Endpoint
- Owner: Backend Engineer B
- Scope:
  - `GET /api/v1/sessions/{id}/graph` returns concepts + relations.
- Acceptance:
  - Response code `200` after extraction.
  - `404` before extraction.

## AX-007 UI Vertical Slice
- Owner: Frontend Engineer A
- Scope:
  - `ui/axiomate-explorer` can run a full upload->extract->graph flow.
- Acceptance:
  - Button run updates summary counts and raw JSON.
  - Works on desktop and mobile viewport.

## AX-008 Contract Test
- Owner: QA Engineer
- Scope:
  - Keep contract smoke checks for day-1 endpoints.
- Acceptance:
  - `tests/contract.test.mjs` passing.

## AX-009 Happy Path E2E
- Owner: QA Engineer
- Scope:
  - Session -> upload -> extract -> graph end-to-end test.
- Acceptance:
  - `tests/pipeline-e2e.test.mjs` passing.

## AX-010 Rust Core Skeleton
- Owner: Rust Engineer A
- Scope:
  - Add starter crate for validation and attestation API shape.
- Acceptance:
  - `crates/axiomate-explorer-core/src/lib.rs` compiles in isolation.
  - Unit tests pass.
