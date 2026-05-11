# Axiomate Explorer Handover Report

Date: 2026-05-12 (updated)
Scope: End-to-end Axiomate Explorer MVP handover for a new coding agent
Status: In progress, buildable vertical slice with Rust-first validate/repair/attest path and fixture-backed tests

## 1. Canonical Documentation Map

All current Axiomate planning and specification documents are listed below and should be treated as source material during continuation work.

1. `Axiomate/AxiomaticrulesVX.md`
- Purpose: Formal semantic foundation (System A + System B rules).
- Use in implementation: Rule vocabulary and conflict/consistency logic basis.

2. `Axiomate/MVP_SCOPE.md`
- Purpose: Product requirements, feature set, acceptance criteria, exclusions.
- Use in implementation: Defines MVP must-haves and measurable success criteria.

3. `Axiomate/ARCHITECTURE.md`
- Purpose: Master technical architecture and phase plan.
- Use in implementation: Runtime/data flow design, boundaries, and target integration approach.

4. `Axiomate/REPO_PLACEMENT.md`
- Purpose: Concrete repo placement, scaffolding tree, freeze policy, API conventions.
- Use in implementation: Placement governance and contract stability constraints.

5. `Axiomate/SPRINT_BOARD_2W.md`
- Purpose: Sequenced implementation plan with dependencies, milestones, risks.
- Use in implementation: Sprint execution order and acceptance checkpoints.

6. `Axiomate/DAY1_TICKETS.md`
- Purpose: Immediate ticket-level actions for first delivery tranche.
- Use in implementation: Day-1 completion checklist and ownership map.

7. `Axiomate/contracts/openapi.yaml`
- Purpose: REST contract (v0.1.0) with freeze metadata and endpoint schemas.
- Use in implementation: Primary API source of truth.

8. `Axiomate/contracts/mcp-tools.json`
- Purpose: MCP tool contract aligned with REST stages.
- Use in implementation: MCP-facing API/tool schema alignment.

## 2. Current Implementation Snapshot

### 2.1 Backend API (Node/TS)
Location: `npm/packages/axiomate-explorer-api`

Implemented routes in `npm/packages/axiomate-explorer-api/src/server.ts`:
- `POST /api/v1/sessions`
- `POST /api/v1/sessions/{sessionId}/documents`
- `POST /api/v1/sessions/{sessionId}/extract`
- `GET /api/v1/sessions/{sessionId}/graph`
- `POST /api/v1/sessions/{sessionId}/validate`
- `POST /api/v1/sessions/{sessionId}/repairs`
- `GET /api/v1/sessions/{sessionId}/traces`
- `POST /api/v1/sessions/{sessionId}/attest`
- `POST /api/v1/attestations/verify`
- `GET /api/v1/sessions/{sessionId}/export`
- `GET /health`

State store:
- `npm/packages/axiomate-explorer-api/src/store/memoryStore.ts`
- Session-scoped in-memory artifacts: docs, graph, runs, validation, traces, attestation, idempotency cache for repairs.

Extraction logic:
- `npm/packages/axiomate-explorer-api/src/services/extractor.ts`
- Deterministic text heuristics for concept extraction and pattern-based relation inference.

### 2.2 Rust Core
Location: `crates/axiomate-explorer-core`

Implemented library:
- `crates/axiomate-explorer-core/src/lib.rs`
- Provides contract-shaped types and logic for:
  - validation report generation
  - repair action execution (`apply_repair`)
  - attestation generation (graph/evidence/trace hashing)

Implemented CLI for adapter boundary:
- `crates/axiomate-explorer-core/src/bin/axiomate-explorer-core-cli.rs`
- JSON over stdin/stdout operations:
  - `validate`
  - `repair`
  - `attest`

### 2.3 Rust Adapter in Node API
Location: `npm/packages/axiomate-explorer-api/src/adapters/rustCoreAdapter.ts`

Behavior:
- Spawns Rust CLI via `cargo run --manifest-path crates/axiomate-explorer-core/Cargo.toml --bin axiomate-explorer-core-cli`.
- API server uses Rust-first for validate/repair/attest with JS fallback in auto mode.

Environment toggle in `npm/packages/axiomate-explorer-api/src/server.ts`:
- `AXIOMATE_USE_RUST_CORE=auto` (default): try Rust first, fallback to JS.
- `AXIOMATE_USE_RUST_CORE=1`: require Rust path (fail if Rust invocation fails).
- `AXIOMATE_USE_RUST_CORE=0`: disable Rust path and use JS fallback.

### 2.4 Frontend
Location: `ui/axiomate-explorer`

Implemented starter UI:
- `ui/axiomate-explorer/src/main.ts`
- `ui/axiomate-explorer/src/styles.css`
- `ui/axiomate-explorer/src/contracts/generated-types.ts`

Current UI supports:
- Upload text path to API
- Extraction and graph rendering summary
- Validation display
- Trace sample display
- Attestation display
- Export preview
- Basic first-conflict repair action trigger

### 2.5 Tests and Fixtures
API tests:
- `npm/packages/axiomate-explorer-api/tests/contract.test.mjs`
- `npm/packages/axiomate-explorer-api/tests/pipeline-e2e.test.mjs`
- `npm/packages/axiomate-explorer-api/tests/fixture-thresholds.test.mjs`
- `npm/packages/axiomate-explorer-api/tests/repair-rust-path.test.mjs`
- `npm/packages/axiomate-explorer-api/tests/error-envelope.test.mjs`

Fixtures:
- `tests/axiomate-explorer/fixtures/sample-policy.md`
- `tests/axiomate-explorer/fixtures/sample-swebok.txt`
- `tests/axiomate-explorer/fixtures/conflicting-definitions.md`

## 3. What Is Done vs Plan

Mapped to `Axiomate/SPRINT_BOARD_2W.md` and `Axiomate/DAY1_TICKETS.md`:

Completed/mostly completed:
- AX-001/AX-002: Contracts are defined and frozen at `0.1.0` in source docs.
- AX-003: API/UI/Rust scaffolds exist in planned target locations.
- AX-010 through AX-013: Core day-1 API vertical slice implemented.
- AX-008/AX-009: Contract smoke + happy path E2E test passing.
- AX-030 (extended): Rust core now includes validate + repair + attest surface callable via CLI/adapter.
- AX-031/AX-033 (partial): repair semantics are in Rust core and `/repairs` is Rust-first at API layer with idempotency preserved.
- AX-040/AX-041/AX-042/AX-043 (starter level): Trace, attestation, verify, and export endpoints implemented in MVP/starter form.
- AX-014 (partial): error envelope standardized with optional `error.details`, plus test coverage.
- AX-051 (partial): end-to-end path includes repair + idempotency validation in API tests.

Partially complete / pending hardening:
- AX-032: Symbolic validator depth is still MVP-level heuristic logic; no graph adapter/mincut integration yet.
- AX-052: Performance checks are not yet automated (no benchmark harness or CI gates for latency budgets).
- Acceptance fixture thresholds in `Axiomate/SPRINT_BOARD_2W.md` are now codified as assertions, but current fixture text volume and heuristics do not yet match aspirational target counts (`>=20/15`, `>=50/40`).

## 4. Deviations and Reconciliation Notes

There is a temporary implementation-path deviation from `Axiomate/ARCHITECTURE.md`:

1. Backend target in architecture doc:
- Planned: add `/axiomate/*` to `crates/mcp-brain-server` (Axum).
- Current: parallel Node API package (`npm/packages/axiomate-explorer-api`) used as low-risk incremental delivery path.

2. UI target in architecture doc:
- Planned: SvelteKit app under `ui/axiomate/`.
- Current: Vite TypeScript starter under `ui/axiomate-explorer/`.

Recommendation:
- Keep current vertical slice as incubation path.
- Once behavior stabilizes, either:
  - migrate API handlers into `mcp-brain-server` and keep contracts unchanged, or
  - formally bless Node package path by updating `Axiomate/ARCHITECTURE.md` to reflect implementation choice.

## 5. Runbook for New Agent

Repository root: `c:\Users\GavinKnight\OneDrive - Quadtech\Documents\Ruvector\RuVector`

### 5.1 Rust core tests
```powershell
Set-Location "c:\Users\GavinKnight\OneDrive - Quadtech\Documents\Ruvector\RuVector"
cargo test --manifest-path "crates/axiomate-explorer-core/Cargo.toml"
```

### 5.2 API tests
```powershell
Set-Location "c:\Users\GavinKnight\OneDrive - Quadtech\Documents\Ruvector\RuVector\npm\packages\axiomate-explorer-api"
npm install --workspaces=false --legacy-peer-deps
npm test --workspaces=false
```

### 5.3 UI build
```powershell
Set-Location "c:\Users\GavinKnight\OneDrive - Quadtech\Documents\Ruvector\RuVector\ui\axiomate-explorer"
npm install --workspaces=false --legacy-peer-deps
npm run build --workspaces=false
```

### 5.4 API run modes
```powershell
# default auto mode
$env:AXIOMATE_USE_RUST_CORE="auto"

# force Rust path
$env:AXIOMATE_USE_RUST_CORE="1"

# disable Rust path
$env:AXIOMATE_USE_RUST_CORE="0"
```

## 6. Immediate Next Actions (Priority Order)

Aligned with `Axiomate/SPRINT_BOARD_2W.md` and `Axiomate/ARCHITECTURE.md`:

1. Add performance-validation mechanism (AX-052)
- Create benchmark harness for extract/validate/repair/attest latency.
- Define baseline vs candidate comparisons and CI gates against MVP performance criteria in `Axiomate/MVP_SCOPE.md`.

2. Improve extraction/relation quality toward fixture acceptance targets
- Tune deterministic extraction and relation inference to better align with acceptance expectations in `Axiomate/SPRINT_BOARD_2W.md`.
- Keep explainability-first traces and avoid non-deterministic behavior.

3. Harden Rust adapter operational behavior
- Add explicit timeout handling and clearer failure diagnostics around Rust CLI invocation.
- Add prebuilt-binary execution option to avoid per-request `cargo run` overhead while preserving `AXIOMATE_USE_RUST_CORE` modes.

4. UI evolution to planned architecture
- Introduce conflict queue and detailed trace viewer flow.
- Keep mobile-responsiveness and explainability constraints from MVP docs.

5. Decide architecture convergence path
- Option A: migrate endpoints into `mcp-brain-server`.
- Option B: keep Node API as canonical and update architecture doc accordingly.

## 7. Risks and Watchpoints for Incoming Agent

1. Rust adapter path/cwd assumptions
- `rustCoreAdapter.ts` computes root from current cwd.
- If service is started from unexpected cwd, manifest path resolution may fail.
- Mitigation: pass explicit repo root env var or harden path discovery.

2. Performance of `cargo run` per request
- Current adapter invokes `cargo run` process each call.
- Fine for development, not efficient for production.
- Mitigation: compile once and run binary directly, or introduce long-running sidecar process.

3. Acceptance-threshold gap vs fixture volume/heuristics
- Fixture assertions exist, but sprint-board target counts are higher than current deterministic extraction behavior on current fixture content.
- Mitigation: improve extraction/relation heuristics and/or expand fixture corpora while keeping contract and explainability constraints.

4. Contract freeze discipline
- `Axiomate/contracts/openapi.yaml` is v0.1.0 additive-only per freeze policy.
- Do not introduce breaking schema changes during current sprint.

5. Partial parity with master architecture
- Current implementation is pragmatically ahead in some areas and divergent in stack placement.
- Keep docs and code synchronized to prevent drift.

## 8. Handover Acceptance Checklist

- [x] All Axiomate plan/spec docs identified and cross-referenced.
- [x] Current implementation inventory documented by component.
- [x] Verified run/test commands captured.
- [x] Next prioritized tasks and risk notes provided.
- [x] Contract freeze and API conventions reiterated for continuity.

---

For full context, always read these in order before making architectural changes:
1. `Axiomate/MVP_SCOPE.md`
2. `Axiomate/ARCHITECTURE.md`
3. `Axiomate/REPO_PLACEMENT.md`
4. `Axiomate/SPRINT_BOARD_2W.md`
5. `Axiomate/contracts/openapi.yaml`
6. `Axiomate/contracts/mcp-tools.json`
7. `Axiomate/DAY1_TICKETS.md`
8. `Axiomate/AxiomaticrulesVX.md`
