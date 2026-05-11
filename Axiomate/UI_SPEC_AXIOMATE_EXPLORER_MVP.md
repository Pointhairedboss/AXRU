# Axiomate Explorer UI Specification (MVP Handoff)

Version: 1.0
Date: 2026-05-12
Status: Ready for UX/Product Design and Frontend implementation handoff
Primary audience: Product Designer, UX Designer, Frontend Engineer

## Executive Summary
Axiomate Explorer MVP UI is a trust-first knowledge workbench for non-technical users. The interface must let users upload one or more domain documents, run extraction, inspect the concept graph, resolve conflicts with explicit repair actions, review reasoning traces, and generate/verify attestation-backed exports.

This spec continues the existing vertical slice and architecture direction without re-planning the product. It preserves OpenAPI `v0.1.0` additive-only constraints and maps all major UI behaviors to currently available endpoints in `Axiomate/contracts/openapi.yaml` and generated TypeScript types.

Final product decisions included in this spec:
- Multi-document upload: exposed in MVP primary flow.
- Run history timeline: included in MVP using available run/stage data.
- Verify input: supports both server-generated and arbitrary pasted/uploaded bundles.
- Graph library: open choice (adapter-based design).
- Telemetry sink: no shared frontend sink found in `ui/*`; implement a thin pluggable telemetry adapter.

## 1. Product UX Overview
### 1.1 Intended Users
- Business analysts and domain owners with limited technical background.
- Governance/compliance reviewers who need evidence-backed outputs.
- Product and operations stakeholders validating conflict handling and reasoning quality.

### 1.2 Primary Jobs-To-Be-Done
- Upload domain documents and quickly get an understandable concept graph.
- Review relationships and confidence with source-linked evidence.
- Resolve contradictory or low-confidence graph states.
- Understand why a concept/relation exists through trace steps.
- Export artifacts with verifiable attestation context.

### 1.3 UX Principles
- Evidence first: no concept/edge without source linkage.
- Explain before automate: every inference must be inspectable.
- Explicit state transitions: users always know current pipeline stage.
- Safe edits: repair actions are deliberate and auditable.
- Progressive disclosure: default simple view, expandable depth.

### 1.4 Trust and Explainability Requirements
- Every concept must expose label, confidence, and evidence references.
- Every relation must expose type, direction, confidence, evidence references.
- Every traceable entity must show rule ID and operation steps.
- Verification UI must explain what checks prove and what they do not prove.

### 1.5 Anti-Drift Alignment
This UI must remain aligned to:
- Vision and MVP scope in `Axiomate/MVP_SCOPE.md`.
- Existing implementation path in `Axiomate/HANDOVER_REPORT.md`.
- Repo placement and contract freeze policy in `Axiomate/REPO_PLACEMENT.md`.
- Existing API and UI behavior in:
  - `npm/packages/axiomate-explorer-api/src/server.ts`
  - `ui/axiomate-explorer/src/main.ts`

No breaking contract changes are allowed during MVP.

## 2. Information Architecture
### 2.1 App Structure
- `/` (Landing + Session + Upload/Ingest)
- `/session/:sessionId/workbench` (Main workbench)
- `/session/:sessionId/verify` (Independent verify tool)

### 2.2 Workbench Navigation
Tabs in fixed order:
1. Ingest
2. Extraction Review
3. Graph
4. Conflicts
5. Traces
6. Attestation
7. Export

Desktop: top tabs + right inspector panel.
Tablet/mobile: horizontal tab strip + drawer/bottom sheet inspector.

### 2.3 Page Responsibilities
- Ingest: create session, upload multiple docs, run extraction.
- Extraction Review: summarized concepts/relations and confidence distribution.
- Graph: interactive graph exploration with entity inspector.
- Conflicts: queue and repair workflows with idempotent actions.
- Traces: human-readable reasoning trace browsing.
- Attestation: generate and inspect attestation bundle.
- Verify: verify server-generated or pasted/uploaded bundles.
- Export: format selection and artifact retrieval/preview.

### 2.4 Session Lifecycle UX Model
1. `Create session` -> `POST /sessions`
2. `Upload document(s)` -> `POST /sessions/{sessionId}/documents`
3. `Run extract` -> `POST /sessions/{sessionId}/extract`
4. `Fetch graph` -> `GET /sessions/{sessionId}/graph`
5. `Validate` -> `POST /sessions/{sessionId}/validate`
6. `Repair` -> `POST /sessions/{sessionId}/repairs` with `X-Idempotency-Key`
7. `Traces` -> `GET /sessions/{sessionId}/traces`
8. `Attest` -> `POST /sessions/{sessionId}/attest`
9. `Verify` -> `POST /attestations/verify`
10. `Export` -> `GET /sessions/{sessionId}/export?format=...`

## 3. Screen-by-Screen Specification
### 3.1 Upload/Ingest Screen
Purpose: Start a session and ingest one or more documents.

Layout regions:
- Header: app title, backend health, current session chip.
- Left: upload dropzone + paste textarea fallback.
- Right: document queue with per-document parse status.
- Footer action bar: `Run Extract`.

Components:
- `SessionStartCard`
- `DocumentUploader`
- `DocumentQueueTable`
- `PipelineStatusBar`

Data required:
- `Session`
- `Document`

API sequence:
- `POST /sessions` when session not initialized.
- Repeated `POST /sessions/{id}/documents` for each added doc.

Loading/empty/error:
- Empty: show sample text CTA.
- Loading: upload progress state per document row.
- Error: show API error envelope mapped message.

Primary actions:
- `Run Extract`

Secondary actions:
- `Add Document`, `Remove`, `Replace`, `Clear Queue`

Success criteria:
- User can ingest multiple docs without hidden advanced mode.

### 3.2 Extraction Review
Purpose: Confirm extraction quality and readiness for graph exploration.

Layout regions:
- KPI strip: concepts, relations, run ID.
- Concept table.
- Relation table grouped by relation type.

Components:
- `ExtractionSummary`
- `ConceptTable`
- `RelationTable`
- `EvidenceRefChip`

Data required:
- `GraphSnapshot`

API sequence:
- `POST /extract`
- `GET /graph`

States:
- Loading skeleton rows.
- Empty graph guidance if no inferred entities.
- Error with retry action.

Primary action:
- `Open Graph`

Secondary actions:
- `Run Validate`

Success criteria:
- User sees count summary and top extracted entities immediately.

### 3.3 Graph Exploration
Purpose: Explore topology, inspect entities, and understand relation semantics.

Layout regions:
- Main graph canvas.
- Top controls row: filters and zoom controls.
- Right inspector panel for selected entity.

Components:
- `GraphCanvas`
- `GraphFilters`
- `GraphLegend`
- `EntityInspector`

Data required:
- `GraphSnapshot`
- selected `Concept` or `Relation`

API sequence:
- `GET /graph` on entry.
- refetch after repair and on manual refresh.

States:
- Loading canvas.
- Empty and error fallback with retry.

Primary actions:
- Select node/edge to inspect evidence/confidence.

Secondary actions:
- Filter relation types.
- Confidence threshold slider.
- Jump to trace/conflict.

Success criteria:
- 50+ nodes/edges interactive under MVP latency goals.

### 3.4 Conflict Queue and Repair Workflow
Purpose: Display conflicts and apply explicit repair actions.

Layout regions:
- Conflict list (left).
- Conflict details + suggested repairs (right).
- Repair result banner.

Components:
- `ConflictQueue`
- `ConflictDetail`
- `RepairActionGroup`
- `RepairResultBanner`

Data required:
- `ValidationReport.conflicts`
- `ValidationReport.suggestedRepairs`

API sequence:
- `POST /validate`
- `POST /repairs` with idempotency key
- `POST /validate` and `GET /graph` after each repair

States:
- No conflicts (`valid`).
- Repair pending.
- Failed repair with retry option.

Primary actions:
- `Apply Repair`

Secondary actions:
- `Skip`, `Refresh Validation`, `Copy conflict details`

Success criteria:
- User can perform at least one repair cycle with clear outcome.

### 3.5 Trace Explanation View
Purpose: Make extraction and inference reasoning readable to non-technical users.

Layout regions:
- Trace list by entity type.
- Expandable timeline steps.
- Evidence reference panel.

Components:
- `TraceList`
- `TraceTimeline`
- `RuleBadge`
- `EvidenceRefList`

Data required:
- `Trace[]`

API sequence:
- `GET /traces`

States:
- Empty traces prompt.
- Loading list.
- API error with retry.

Primary actions:
- Expand step details.

Secondary actions:
- Jump to graph entity.
- Copy trace JSON.

Success criteria:
- User can explain why an entity exists using visible rule/evidence chain.

### 3.6 Attestation + Verify
Purpose: Generate integrity bundle and verify authenticity checks.

Layout regions:
- Attestation generation card.
- Hash summary card.
- Verify input mode selector.
- Verification checks result table.

Components:
- `AttestationGenerator`
- `AttestationSummary`
- `VerifyInputSwitcher`
- `VerifyChecksTable`
- `TrustBoundaryCallout`

Data required:
- `AttestationBundle`
- `VerifyAttestationResponse`

API sequence:
- `POST /attest`
- `POST /attestations/verify`

Verify input modes:
- Mode A: use current session bundle.
- Mode B: paste/upload arbitrary bundle JSON.

States:
- Not generated.
- Generated and verified.
- Invalid verification response.

Primary actions:
- `Generate Attestation`
- `Verify`

Secondary actions:
- `Copy hashes`, `Copy bundle JSON`

Success criteria:
- User can verify both in-session and external bundles.

### 3.7 Export View
Purpose: Retrieve export artifacts with format control and attestation reference.

Layout regions:
- Format selector.
- Export action bar.
- Artifact preview pane.

Components:
- `ExportFormatSelector`
- `ExportButton`
- `ArtifactPreview`
- `AttestationReference`

Data required:
- export response object (`format`, `artifact`, `attestationId`)

API sequence:
- `GET /sessions/{sessionId}/export?format={json|txt|svg|ttl|cypher}`

States:
- No graph yet.
- Feature-flagged format notice (svg/ttl/cypher during Sprint 1).
- Export error.

Primary action:
- `Export`

Secondary actions:
- `Copy artifact`

Success criteria:
- JSON/TXT export ready for MVP demos and handoffs.

### 3.8 Global Status and Notifications
Purpose: Keep users informed of stage transitions and failure recovery.

Components:
- `ToastStack`
- `InlineErrorBanner`
- `StageChip`
- `RunTimeline`

Run timeline requirement:
- Timeline is required in MVP and should render from available observed run events (`runId`, `runVersion`, `stage`, `status`) as calls complete.
- If historical events are not persisted by API, timeline is session-local UI memory for current app session.

## 4. Interaction and Behavior Contracts
### 4.1 Core User Flow
1. Create session.
2. Upload one or more docs.
3. Run extraction.
4. Review extracted graph.
5. Run validation.
6. Apply repair(s) if needed.
7. Inspect traces.
8. Generate and optionally verify attestation.
9. Export artifact.

### 4.2 Button and Disabled State Rules
- `Run Extract` disabled until at least one parsed document exists.
- `Run Validate` disabled until graph exists.
- `Apply Repair` disabled while request is in-flight for selected conflict.
- `Generate Attestation` disabled until graph and traces are available.
- `Export` disabled until graph exists.

### 4.3 Update Semantics
- Mutation actions are pessimistic (UI confirms only after server response).
- Read calls can refresh silently where safe.
- Manual refresh controls available in each major panel.

### 4.4 Retry Semantics and Idempotency
- Repair calls must send deterministic idempotency key:
  - format: `repair-{sessionId}-{conflictId}-{actionType}-{payloadHash}`
- Network retry for repair must reuse same key.
- UI must indicate when response is replayed from idempotency cache.

### 4.5 Polling vs Immediate Fetch
- No continuous polling for pipeline stages in MVP.
- Immediate chained fetches after actions:
  - extract -> graph
  - repair -> validate -> graph
  - attest -> verify optional

## 5. Visual Design System Spec
### 5.1 Design Direction
A warm, analytical "evidence desk" visual language:
- calm backgrounds
- high-legibility type
- strong semantic status colors
- minimal ornamental motion

### 5.2 Typography
- Primary UI: `IBM Plex Sans`
- Data/IDs/hashes: `IBM Plex Mono`
- Optional heading accent: `Source Serif 4`

### 5.3 Token Baseline
- Background: `#f4efe3`, `#f9f6ef`
- Panel: `#fffaf0`
- Ink: `#22201b`
- Accent: `#147d64`
- Warning/error: `#9e2a2b`
- Border line: `#d9cbb0`

Status semantic mapping:
- `high`: red scale
- `medium`: amber scale
- `low`: green scale
- `info`: blue scale

### 5.4 Component States
All interactive components must support:
- default
- hover
- focus-visible
- active
- disabled
- loading
- error

### 5.5 Motion
- Meaningful only:
  - stage transition highlight
  - conflict queue item insert/remove
  - inspector open/close
- Respect reduced motion preferences.

### 5.6 Responsive Requirements
- Desktop `>=1200px`: 3-region workbench (nav/content/inspector).
- Tablet `768-1199px`: 2-region with collapsible inspector.
- Mobile `<768px`: stacked sections, sticky action bar, bottom-sheet inspector.

### 5.7 Accessibility Requirements
- WCAG AA contrast minimum.
- Full keyboard operation for all actions.
- Focus order follows visual reading order.
- ARIA labels for icon-only controls.
- `aria-live="polite"` for status updates.
- Graph canvas must have keyboard/list fallback representation.

## 6. Component Inventory and Props Contracts
### 6.1 Core Components
- `AppShell`
  - props: `sessionId`, `stage`, `status`, `health`
  - events: `navigate`, `resetSession`

- `RunTimeline`
  - props: `events: RunEvent[]`
  - events: none

- `DocumentUploader`
  - props: `sessionId`, `acceptedTypes`, `maxSizeMb`
  - events: `uploadRequested`, `uploadFailed`

- `DocumentQueueTable`
  - props: `documents: Document[]`
  - events: `removeDocument`, `replaceDocument`

- `ExtractionSummary`
  - props: `graph: GraphSnapshot`

- `GraphCanvas`
  - props:
    - `graph: GraphSnapshot`
    - `filters: GraphFilterState`
    - `selectedEntityId?: string`
    - `adapter: GraphAdapter`
  - events:
    - `nodeSelected(conceptId)`
    - `edgeSelected(relationId)`
    - `backgroundSelected()`

- `EntityInspector`
  - props: `entity`, `traces`, `lookupMaps`

- `ConflictQueue`
  - props: `conflicts: Conflict[]`, `selectedConflictId?`
  - events: `selectConflict(conflictId)`

- `ConflictCard`
  - props: `conflict: Conflict`, `suggestedActions: RepairAction[]`, `busy: boolean`
  - events: `applyRepair(action)`

- `TraceList`
  - props: `traces: Trace[]`
  - events: `selectTrace(traceId)`

- `TraceTimeline`
  - props: `trace: Trace`

- `AttestationPanel`
  - props: `attestation?: AttestationBundle`
  - events: `generateAttestation`

- `VerifyPanel`
  - props: `defaultAttestation?: AttestationBundle`
  - events: `verifyRequested(attestation)`

- `ExportPanel`
  - props: `formats`, `selectedFormat`, `artifact?`, `attestationId?`
  - events: `exportRequested(format)`

### 6.2 Graph Interaction Requirements
- Must support pan, zoom, fit-to-screen.
- Must support relation type filtering.
- Must support confidence filtering.
- Must support click/keyboard selection with inspector sync.
- Must support fallback list for accessibility and low-end devices.

### 6.3 Exact Conflict and Trace Mapping
Conflict card mapping:
- title <- `conflict.code`
- severity <- `conflict.severity`
- message <- `conflict.message`
- related IDs <- `conflict.relatedIds`
- actions <- `suggestedRepairs.filter(r => r.conflictId === conflict.conflictId)`

Trace card mapping:
- header <- `${trace.entityType}:${trace.entityId}`
- steps <- `trace.steps`
- step fields <- `index`, `ruleId`, `operation`, `inputEvidenceIds`, `confidence`, optional `beforeStateRef`, `afterStateRef`

## 7. Data Contract Mapping
### 7.1 Available Now
From `Axiomate/contracts/openapi.yaml` and generated TS types:
- Session: `Session`
- Document upload: `UploadDocumentRequest`, `Document`
- Extract run: `PipelineRun`
- Graph: `GraphSnapshot`, `Concept`, `Relation`
- Validation: `ValidationReport`, `Conflict`, `RepairAction`
- Traces: `Trace`, `TraceStep`
- Attestation: `AttestationBundle`
- Verify: `VerifyAttestationRequest`, `VerifyAttestationResponse`
- Export response: `{ format, artifact, attestationId }`

### 7.2 UI Model Mapping
- `WorkbenchState.session` <- `Session`
- `WorkbenchState.documents` <- `Document[]`
- `WorkbenchState.graph` <- `GraphSnapshot`
- `WorkbenchState.validation` <- `ValidationReport`
- `WorkbenchState.traces` <- `Trace[]`
- `WorkbenchState.attestation` <- `AttestationBundle`
- `WorkbenchState.verifyResult` <- `VerifyAttestationResponse`
- `WorkbenchState.timelineEvents` <- observed `PipelineRun` events + stage completion markers

### 7.3 Additive Non-Breaking Proposals (Optional)
- Add `timestamp` on `PipelineRun` to improve timeline fidelity.
- Add optional `durationMs` on stage responses.
- Add optional `evidenceQuotes` on trace steps for direct readability.
- Add optional `evidenceIds` to `Conflict` for richer conflict context.

## 8. Error and Trust UX
### 8.1 Standard Error Messaging
Map API `error.code` to user-facing messages:
- `VALIDATION_ERROR`: "Some inputs are invalid. Check fields and try again."
- `INVALID_JSON`: "Request payload could not be parsed."
- `GRAPH_NOT_FOUND`: "No graph yet. Run extraction first."
- `VALIDATION_NOT_FOUND`: "Run validation before repair."
- `CONFLICT_NOT_FOUND`: "Conflict is no longer current. Refresh validation."
- `INVALID_FORMAT`: "Export format is not supported."
- `NOT_FOUND`: "Requested resource not found."
- `INTERNAL_ERROR`: "Unexpected server error. Please retry."

### 8.2 Explainability Rules
- Every concept and relation visible in UI must have an accessible "Why?" path.
- "Why?" path links to trace list entry and evidence references.
- Confidence without evidence references is not allowed in final UI.

### 8.3 Attestation Trust Boundaries
Verification view must include explicit copy:
- Verifies: hash structure/check consistency and required metadata checks.
- Does not verify: domain truth, extraction completeness, business correctness.

## 9. Performance and Usability Requirements
### 9.1 Performance Budgets
- Session create: p95 < 300ms
- Upload accept (text/markdown): p95 < 1s
- Extract + graph retrieval (50-node target): p95 < 5s
- Graph render (50+ nodes): < 2s
- Graph interaction latency: < 200ms
- Validation: p95 < 2s
- Repair action to refreshed state: p95 < 2.5s
- Attestation generation: p95 < 1s
- Export json/txt: p95 < 1s

### 9.2 Instrumentation Points
Track frontend timings/events:
- `session.create.start|end`
- `document.upload.start|end`
- `extract.start|end`
- `graph.render.start|end`
- `validate.start|end`
- `repair.apply.start|end`
- `trace.open`
- `attestation.generate.start|end`
- `verify.start|end`
- `export.start|end`

### 9.3 Telemetry Sink Strategy
Current repo scan did not reveal a shared reusable frontend telemetry client in `ui/*`.
Implement a local `TelemetryAdapter` interface in `ui/axiomate-explorer` with:
- default no-op adapter
- optional Plausible-compatible adapter via env config

## 10. Implementation Handoff Plan
### 10.1 Phased Build Plan
Phase 1: Shell and state foundation
- Add typed API client, workbench store, stage chips, run timeline.

Phase 2: Ingest and extraction views
- Multi-document queue, extraction summary tables.

Phase 3: Graph and inspector
- Integrate graph adapter, entity inspector, filters.

Phase 4: Validation and repairs
- Conflict queue, repair action handling, idempotency behavior.

Phase 5: Traces, attestation, verify
- Trace timeline UI, attestation generation, dual-mode verify.

Phase 6: Export, telemetry, a11y, polish
- Export panel, telemetry adapter wiring, accessibility and responsive hardening.

### 10.2 Target Structure (`ui/axiomate-explorer`)
- `src/app/`
- `src/components/`
- `src/state/`
- `src/api/`
- `src/contracts/`
- `src/styles/`
- `src/telemetry/`
- `src/tests/component/`
- `src/tests/integration/`
- `src/tests/e2e/`

### 10.3 Test Plan
Component tests:
- upload queue
- graph inspector
- conflict card + repair controls
- trace timeline
- attestation and verify panels

Integration tests:
- ingest -> extract -> graph
- validate -> repair -> revalidate
- attest -> verify
- export flows

E2E tests:
- full MVP path on fixture docs
- verify pasted external bundle
- mobile viewport journey

Visual regression:
- core screens at desktop/tablet/mobile
- conflict severity badges
- trace step timeline
- verification results states

### 10.4 Acceptance Checklist for UI Complete
- Multi-document ingest exposed and usable.
- Run timeline visible and updated from available run events.
- Graph, conflict, trace, attestation, verify, export flows operational.
- Verify supports both current-session and pasted/uploaded bundles.
- API contract usage remains additive-only and type-safe.
- Accessibility baseline achieved (keyboard, focus, contrast, ARIA).
- Responsive behavior validated.
- Happy-path and fixture tests passing.

## Open Questions and Assumptions
### Assumptions
- Current Node API path remains canonical for MVP (`/api/v1`).
- Timeline can initially be UI-maintained from observed events until a dedicated run-history endpoint exists.
- Graph library selection remains open and may be finalized after implementation spike.

### Open Questions
- Should timeline persistence survive page refresh for same session?
- Should feature-flagged export formats be hidden or shown with explanatory lock state?
- Should verify page support `.json` file upload and direct text paste at launch, or staged rollout?

## Priority-Ordered UI Backlog
1. Build typed API client + unified workbench store.
2. Implement shell, stage chips, run timeline.
3. Implement exposed multi-document ingest queue.
4. Implement extraction review tables and confidence summary.
5. Implement graph canvas + inspector with adapter abstraction.
6. Implement validate/conflict queue and idempotent repair UX.
7. Implement trace explorer with entity jump links.
8. Implement attestation generation + dual-mode verify.
9. Implement export panel with format and artifact preview.
10. Implement telemetry adapter and performance event capture.
11. Complete accessibility and responsive pass.
12. Complete test suites and visual regression baseline.
