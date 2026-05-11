# Axiomate Explorer Repo Placement and Scaffolding

## Placement Principles
- Reuse existing Rust crates where possible; add a thin integration crate for explorer-specific orchestration.
- Keep UI isolated under `ui/` and avoid coupling with internal crates directly.
- Keep API contracts versioned under `Axiomate/contracts/` first, then mirror into service packages.
- Prefer additive changes to avoid rewriting core RuVector systems.

## Proposed Placement Map

### Frontend (Browser)
- `ui/axiomate-explorer/`
  - New web app for upload, graph exploration, validation review, traces, and attestation display.

### API/Orchestration Service
- `npm/packages/axiomate-explorer-api/`
  - TypeScript service for request orchestration, session lifecycle, and MCP facade.
  - Uses FFI/bindings or process boundary to call Rust core adapters.

### Rust Integration Core (Explorer Runtime)
- `crates/axiomate-explorer-core/`
  - Explorer pipeline orchestration adapters over existing capabilities.
  - Wraps existing graph/reasoning/compression/verification crates with stable explorer contracts.

### Shared Types/Contracts
- `Axiomate/contracts/openapi.yaml`
- `Axiomate/contracts/mcp-tools.json`
- `npm/packages/axiomate-explorer-api/src/contracts/` (generated or copied from `Axiomate/contracts`)
- `ui/axiomate-explorer/src/contracts/` (generated client types)

### Tests
- `tests/axiomate-explorer/`
  - End-to-end and scenario tests using sample docs from `examples/` or `test_models/`.

## Concrete Scaffolding Tree

```text
Axiomate/
  contracts/
    openapi.yaml
    mcp-tools.json
  REPO_PLACEMENT.md
  SPRINT_BOARD_2W.md

ui/
  axiomate-explorer/
    package.json
    src/
      app/
        routes/
          ingest.tsx
          graph.tsx
          conflicts.tsx
          attestations.tsx
      components/
        UploadPanel.tsx
        GraphCanvas.tsx
        ConflictQueue.tsx
        TraceDrawer.tsx
        AttestationBadge.tsx
      state/
        sessionStore.ts
        runStore.ts
      api/
        client.ts
        generated-types.ts
      tests/
        upload-flow.spec.ts
        conflict-resolution.spec.ts

npm/
  packages/
    axiomate-explorer-api/
      package.json
      src/
        server.ts
        routes/
          sessions.ts
          documents.ts
          runs.ts
          validation.ts
          repairs.ts
          attestations.ts
          exports.ts
          mcp.ts
        services/
          pipelineService.ts
          validationService.ts
          attestationService.ts
        adapters/
          rustCoreAdapter.ts
        store/
          memoryStore.ts
        contracts/
          openapi.yaml
          mcp-tools.json
        tests/
          contract.test.ts
          pipeline-e2e.test.ts

crates/
  axiomate-explorer-core/
    Cargo.toml
    src/
      lib.rs
      models/
        concept.rs
        relation.rs
        evidence.rs
        run_state.rs
        trace.rs
        attestation.rs
      pipeline/
        orchestrator.rs
        extract.rs
        assemble_graph.rs
        validate.rs
        repair.rs
        attest.rs
      adapters/
        graph_adapter.rs
        symbolic_adapter.rs
        compression_adapter.rs
        verification_adapter.rs
      error.rs
      tests/
        pipeline_tests.rs
        validation_tests.rs
        attestation_tests.rs

tests/
  axiomate-explorer/
    fixtures/
      sample-policy.md
      sample-swebok.txt
      conflicting-definitions.md
    e2e/
      demo_path.test.ts
      repair_cycle.test.ts
      proof_verify.test.ts
```

## Minimal Build Order by Placement
1. `Axiomate/contracts/*` as source of truth.
2. `npm/packages/axiomate-explorer-api` with in-memory store and stubbed Rust adapter.
3. `ui/axiomate-explorer` upload plus graph read-only rendering.
4. `crates/axiomate-explorer-core` real adapters and validation/attestation.
5. `tests/axiomate-explorer` end-to-end checks.

## Integration Notes with Existing RuVector Capabilities
- Graph: adapter should consume existing graph crate types and expose explorer DTOs.
- Symbolic reasoning: use existing rule engine; add explorer rule IDs only.
- Compression: use reversible mapping (`kappa`, `kappa^-1`) and store map in run artifacts.
- Verification: attestation hash chain generated in Rust and returned as API artifact.
- MCP/API surface: keep MCP tool names aligned with REST stage names for operability.

## Contract Freeze Policy (v0.1)
- Contract version: `0.1.0`.
- Freeze window: Sprint 1 (Day 1 to Day 10).
- Rule: no breaking changes in field names, required fields, or enum values.
- Allowed changes: additive fields, additive endpoints, additive enum variants behind feature flags.
- Approval gate: Backend Lead + Frontend Lead + Rust Lead sign off before changing `Axiomate/contracts/*`.

## API Conventions
- Error envelope:
  - `error.code` stable machine-readable code.
  - `error.message` user-readable message.
  - `error.details` optional structured payload.
- Time format: RFC3339 UTC timestamps only.
- Idempotency:
  - `POST /sessions/{id}/repairs` accepts `X-Idempotency-Key`.
  - duplicate key within same session returns the first result.
- Timeouts:
  - extract: 30s soft timeout.
  - validate: 20s soft timeout.
  - attest: 10s soft timeout.
- Pagination:
  - not required for MVP responses.
  - when introduced, use `cursor` and `limit` query params.

## Ruleset and Attestation Versioning
- Default ruleset: `axiomate-mvp-v1`.
- Ruleset versions follow `axiomate-<scope>-v<major>`.
- `AttestationBundle.validatorVersion` increments on validation engine changes.
- `AttestationBundle.rulesetId` is mandatory and included in verification checks.

## Sprint 1 Export Scope
- Required: `json`, `txt`.
- Feature-flagged (non-blocking): `svg`, `ttl`, `cypher`.
