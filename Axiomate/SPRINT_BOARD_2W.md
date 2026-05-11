# Axiomate Explorer 2-Week Sprint Board

## Implementation Sequence
1. Lock contracts and repo scaffolding.
2. Build minimal API path (session, upload, extract, graph read).
3. Build UI demo path (upload -> graph -> evidence panel).
4. Integrate Rust validation and repair loop.
5. Add traces and attestation.
6. Ship exports and end-to-end demo hardening.

## Task Breakdown

### Stream A: Contract and Platform (Day 1-2)
- `AX-001` Define REST contract in `Axiomate/contracts/openapi.yaml`.
  - Owner: Backend Lead
  - Priority: P0
  - Output: Approved v0.1 endpoints and schemas.
- `AX-002` Define MCP tool schemas in `Axiomate/contracts/mcp-tools.json`.
  - Owner: Platform Engineer
  - Priority: P0
  - Output: Tool names and IO schemas aligned with REST.
- `AX-003` Create service and UI scaffolds in target repo paths.
  - Owner: Tech Lead
  - Priority: P0
  - Output: Buildable placeholder apps.

### Stream B: Backend/API (Day 2-6)
- `AX-010` Implement `POST /sessions` and in-memory session store.
  - Owner: Backend Engineer A
  - Priority: P0
- `AX-011` Implement `POST /sessions/{id}/documents` parse + span index.
  - Owner: Backend Engineer A
  - Priority: P0
- `AX-012` Implement `POST /sessions/{id}/extract` (deterministic extraction).
  - Owner: Backend Engineer B
  - Priority: P0
- `AX-013` Implement `GET /sessions/{id}/graph` snapshot DTO.
  - Owner: Backend Engineer B
  - Priority: P0
- `AX-014` Implement error model + diagnostics envelope.
  - Owner: Backend Engineer A
  - Priority: P1

### Stream C: Frontend (Day 3-7)
- `AX-020` Upload UI and run status polling.
  - Owner: Frontend Engineer A
  - Priority: P0
- `AX-021` Graph canvas with node/edge interaction.
  - Owner: Frontend Engineer A
  - Priority: P0
- `AX-022` Evidence side panel and source span highlighting.
  - Owner: Frontend Engineer B
  - Priority: P0
- `AX-023` Empty states, error states, and retry UX.
  - Owner: Frontend Engineer B
  - Priority: P1

### Stream D: Rust Core Integration (Day 5-9)
- `AX-030` Add `crates/axiomate-explorer-core` models and orchestrator skeleton.
  - Owner: Rust Engineer A
  - Priority: P0
- `AX-031` Graph adapter to existing RuVector graph capability.
  - Owner: Rust Engineer A
  - Priority: P0
- `AX-032` Symbolic validator for core conflict checks.
  - Owner: Rust Engineer B
  - Priority: P0
- `AX-033` Repair action executor with reversible operations only.
  - Owner: Rust Engineer B
  - Priority: P0

### Stream E: Proof, Trace, Export (Day 8-10)
- `AX-040` Implement `GET /traces` trace step serialization.
  - Owner: Backend Engineer B
  - Priority: P1
- `AX-041` Implement `POST /attest` attestation bundle hash chain.
  - Owner: Rust Engineer A
  - Priority: P0
- `AX-042` Implement `POST /attestations/verify` replay checks.
  - Owner: Rust Engineer B
  - Priority: P0
- `AX-043` Implement export endpoint (json/txt for MVP demo; svg/ttl/cypher behind flag).
  - Owner: Backend Engineer A
  - Priority: P1

### Stream F: Test and Release Readiness (Day 9-10)
- `AX-050` Contract tests (OpenAPI/MCP schema conformance).
  - Owner: QA Engineer
  - Priority: P0
- `AX-051` End-to-end test: upload -> extract -> validate -> repair -> attest -> export.
  - Owner: QA Engineer
  - Priority: P0
- `AX-052` Performance checks for 50+ node graph render and pipeline latency.
  - Owner: QA Engineer
  - Priority: P1
- `AX-053` Demo script and sample fixtures.
  - Owner: PM + QA
  - Priority: P0

## Dependencies
- `AX-001` blocks `AX-010` to `AX-014`, `AX-020` to `AX-023`, `AX-050`.
- `AX-010` + `AX-011` block `AX-012` and `AX-020`.
- `AX-012` blocks `AX-013`, `AX-021`, `AX-022`.
- `AX-030` blocks `AX-031`, `AX-032`, `AX-033`.
- `AX-032` + `AX-033` block `AX-040`, `AX-041`, `AX-042`.
- `AX-041` blocks `AX-043` and acceptance of final export story.
- `AX-050` and `AX-051` block release signoff.

## What to Build First
- First: API contracts + in-memory session/upload/extract/graph path.
- Second: UI upload and graph viewer with evidence panel.
- Third: symbolic validation + repair loop.
- Fourth: traces + attestation + verify.
- Fifth: export polish and performance hardening.

## Prototype vs Productionize
- Prototype now:
  - in-memory artifact store
  - deterministic extraction heuristics
  - json/txt exports
- Productionize next:
  - persistent store and run history retention
  - background job queue for heavy docs
  - signed attestations with key management
  - robust PDF parser fallback chain

## Testing Plan
- Unit tests:
  - extraction rule behavior
  - relation conflict checks
  - repair transforms
  - attestation hash determinism
- Contract tests:
  - endpoint payload schema conformance
  - MCP input/output schema conformance
- Integration tests:
  - pipeline stage transitions
  - validation and revalidation after repair
  - proof verify replay
- UI tests:
  - upload/parse/extract rendering
  - conflict action interaction
  - trace and attestation visibility
- Performance checks:
  - <2s graph render for 50 nodes
  - <200ms interaction latency on graph pan/zoom

## Milestones
- `M1` (End Day 3): Contract freeze + ingest/extract/graph API working.
- `M2` (End Day 6): UI demo path complete with evidence panel.
- `M3` (End Day 8): Validation/repair loop integrated with Rust core.
- `M4` (End Day 10): Trace + attestation + verify + export + E2E green.

## Acceptance Checkpoints
- Checkpoint A: Upload a 5-page document and view extracted graph.
- Checkpoint B: At least one detected contradiction can be repaired and revalidated.
- Checkpoint C: Every displayed relation has source evidence.
- Checkpoint D: Attestation bundle generated and verified as valid.
- Checkpoint E: Exported report includes counts, conflicts, and attestation ID.

## Acceptance Fixtures (Sprint 1)
- `tests/axiomate-explorer/fixtures/sample-policy.md`
  - Expected: >= 20 concepts, >= 15 relations, 0 hard parse errors.
- `tests/axiomate-explorer/fixtures/sample-swebok.txt`
  - Expected: >= 50 concepts, >= 40 relations, >= 1 subsumption chain.
- `tests/axiomate-explorer/fixtures/conflicting-definitions.md`
  - Expected: >= 1 high severity conflict and at least one valid repair suggestion.

## Day-1 Go/No-Go Gate
- OpenAPI and MCP contracts frozen at `0.1.0`.
- `POST /sessions`, `POST /sessions/{id}/documents`, `POST /sessions/{id}/extract`, and `GET /sessions/{id}/graph` working end-to-end.
- UI can upload a text file and render a graph payload from API.
- Contract test and one happy-path E2E test passing in CI.

## Risks
- Risk: Contract churn after frontend starts.
  - Mitigation: Freeze v0.1 schema on Day 1 and use additive changes only.
- Risk: Symbolic checks too slow on dense text.
  - Mitigation: fast ruleset default with strict mode toggle.
- Risk: Extraction false positives hurt trust.
  - Mitigation: confidence threshold + clear evidence panel + manual repair.
- Risk: Attestation perceived as opaque.
  - Mitigation: human-readable verification summary in UI.

## Definition of Done
- Minimal demo path works end-to-end without manual DB setup.
- Validation/repair cycle is functional and auditable by run version.
- Trace and attestation are available for exported artifacts.
- Contract, integration, and E2E tests pass for MVP scenarios.
- Team can run a scripted demo in under 2 minutes from clean start.
