# Axiomate Explorer UI Implementation Cut Plan

Date: 2026-05-12
Target app: `ui/axiomate-explorer`
API target: `npm/packages/axiomate-explorer-api`
Delivery mode: phased frontend implementation against additive-only OpenAPI `0.1.0`

## Delivery Strategy

Do not spend engineering time splitting `Axiomate/UI_MOCKUPS_HANDOFF.html` into production HTML files. The artifact is a visual bundle, not a reusable codebase. Use it for layout and copy reference only, and implement the MVP in the existing `ui/axiomate-explorer` app.

The current `ui/axiomate-explorer/src/main.ts` is a day-1 vertical slice. Keep it only as a proof that the API path works. Replace it with a stateful workbench architecture.

## Phase 0: Contract and State Foundation

Goal: eliminate type drift and create the minimum architecture needed for all later screens.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-001 | Replace ad hoc generated UI types with contract-complete types from `Axiomate/contracts/openapi.yaml`. | One canonical contract source in `ui/axiomate-explorer/src/contracts/`. | none |
| FE-002 | Build typed API client wrappers for sessions, documents, extract, graph, validate, repairs, traces, attest, verify, export. | `src/api/client.ts` and endpoint modules with typed error handling. | FE-001 |
| FE-003 | Create workbench store for session, graph, validation, traces, attestation, verify result, notifications, and timeline events. | `src/state/workbench-store.ts`. | FE-002 |
| FE-004 | Add timeline persistence by `sessionId` in local storage. | `src/state/timeline-persistence.ts`. | FE-003 |
| FE-005 | Add error mapper for API envelopes. | `src/api/error-mapper.ts`. | FE-002 |

### Acceptance

- No screen reads raw `fetch` directly.
- UI contract types cover `Document`, `PipelineRun`, `RepairAction`, verify request/response, and diagnostics.
- Timeline and notifications can be updated independently of any one screen.

## Phase 1: App Shell and Navigation

Goal: move from a one-page demo to a routed workbench.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-010 | Build `AppShell` with header, stage chip, tab nav, inspector slot, and footer. | Shared shell components in `src/components/shell/`. | FE-003 |
| FE-011 | Add route model for `/`, `/session/:sessionId/workbench`, `/session/:sessionId/verify`. | Router/bootstrap setup in `src/app/`. | FE-010 |
| FE-012 | Implement `ToastStack`, `InlineErrorBanner`, and `RunTimeline`. | Global feedback components. | FE-003 |
| FE-013 | Apply tokenized styles based on the MVP spec palette and typography. | `src/styles/` and shared theme variables. | FE-010 |

### Acceptance

- User can create a session, navigate between tabs, and refresh without losing timeline history for the current session.
- All screens render inside one coherent shell instead of separate documents.

## Phase 2: Ingest and Extraction Review

Goal: deliver the front half of the MVP flow.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-020 | Build `SessionStartCard`, `DocumentUploader`, `DocumentQueueTable`, and action bar. | Ingest screen module. | FE-011 |
| FE-021 | Support multi-document queue with local upload progress, per-row retry, and paste-as-document fallback. | Queue state and row components. | FE-020 |
| FE-022 | Implement extract action and chained graph fetch. | Ingest controller actions. | FE-020 |
| FE-023 | Build `ExtractionSummary`, `ConceptTable`, `RelationTable`, and evidence chips. | Extraction screen module. | FE-022 |
| FE-024 | Normalize relation display labels against actual API enums. | Display mapper utilities. | FE-023 |

### Acceptance

- User can upload multiple documents, run extract, and immediately inspect concept/relation results.
- Empty, loading, failed upload, and graph-not-found states are all implemented.

## Phase 3: Graph and Inspector

Goal: deliver the exploration surface without punting accessibility.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-030 | Define `GraphAdapter` interface and choose first rendering adapter. | `src/components/graph/adapter.ts`. | FE-003 |
| FE-031 | Implement `GraphCanvas`, filters, and view controls. | Graph module. | FE-030 |
| FE-032 | Implement `EntityInspector` with evidence and trace links. | Inspector components. | FE-031 |
| FE-033 | Implement fallback entity/relation list mode with synchronized selection. | Accessibility-critical secondary graph view. | FE-031 |

### Acceptance

- Graph interactions stay in sync with inspector and fallback list.
- Keyboard-only users can inspect an entity and navigate to related traces or conflicts.

## Phase 4: Validation and Repairs

Goal: make conflict resolution operational and auditable.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-040 | Build `ConflictQueue`, `ConflictDetail`, and related evidence panel. | Conflicts screen module. | FE-023 |
| FE-041 | Implement `RepairActionGroup` from `suggestedRepairs` rather than hardcoded buttons. | Repair actions UI. | FE-040 |
| FE-042 | Add deterministic idempotency key generation and replay indicator. | `src/state/repair-idempotency.ts`. | FE-041 |
| FE-043 | Chain repair success into `validate -> graph` refresh and notification updates. | Conflicts controller actions. | FE-041 |

### Acceptance

- User can complete a full repair cycle and understand what changed.
- Retrying the same repair reuses the same idempotency key.

## Phase 5: Traces, Attestation, and Verify

Goal: complete the explainability and trust flows.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-050 | Build `TraceList`, `TraceTimeline`, and evidence panel. | Traces screen module. | FE-032 |
| FE-051 | Build `AttestationPanel` with bundle summary and copy actions. | Attestation screen module. | FE-003 |
| FE-052 | Build `VerifyInputSwitcher`, current-session verify mode, and external bundle mode. | Verify screen module. | FE-051 |
| FE-053 | Add local JSON validation for pasted/uploaded bundles before server verify. | Verify helpers and field-level errors. | FE-052 |
| FE-054 | Add invalid, partial, and failed verification result states. | Verify result renderer. | FE-052 |

### Acceptance

- User can verify the current session bundle.
- User can paste or upload an external bundle and verify it.
- Trust boundary notice is always visible.

## Phase 6: Export, Telemetry, and Hardening

Goal: finish the MVP with feature gating, instrumentation, and a11y closure.

### Tickets

| Ticket | Scope | Output | Depends on |
| --- | --- | --- | --- |
| FE-060 | Build `ExportPanel`, preview pane, copy, and download controls. | Export screen module. | FE-023 |
| FE-061 | Render `svg`, `ttl`, and `cypher` as visible locked options with explanatory copy. | Feature-gated selector behavior. | FE-060 |
| FE-062 | Add local `TelemetryAdapter` and emit events defined by the spec. | `src/telemetry/`. | FE-003 |
| FE-063 | Complete accessibility pass: labels, live regions, focus order, reduced motion, graph fallback polish. | Cross-cutting fixes. | FE-033, FE-052, FE-060 |
| FE-064 | Add responsive layout adjustments for desktop, tablet, and mobile workbench variants. | Cross-cutting layout updates. | FE-010 onward |

### Acceptance

- Export supports `json` and `txt` end to end.
- Locked formats remain visible but unavailable.
- Telemetry hooks exist without introducing a mandatory external sink.
- Accessibility checklist can be signed off.

## Recommended Source Layout

```text
ui/axiomate-explorer/src/
  app/
  api/
  components/
    shell/
    ingest/
    extraction/
    graph/
    conflicts/
    traces/
    attestation/
    export/
    shared/
  contracts/
  state/
  styles/
  telemetry/
  tests/
```

## Test Gates By Phase

| Phase | Minimum test gate |
| --- | --- |
| Phase 0 | Type-level compile checks on client/store modules |
| Phase 1 | Smoke test for shell, routing, and timeline persistence |
| Phase 2 | Integration test for create session -> upload -> extract -> graph |
| Phase 3 | Component tests for graph selection and fallback list sync |
| Phase 4 | Integration test for validate -> repair -> revalidate |
| Phase 5 | Integration tests for attest -> verify current session and verify external bundle |
| Phase 6 | Export tests, accessibility checks, responsive visual regression |

## Explicit Non-Goals For This Cut

- No contract-breaking changes to OpenAPI `0.1.0`.
- No attempt to make the mockup HTML itself production code.
- No hidden advanced mode for multi-document ingest.
- No continuous polling loop for pipeline stages in MVP.

## Frontend Engineer Starting Point

1. Replace `ui/axiomate-explorer/src/main.ts` with an app bootstrap and shell.
2. Regenerate or rewrite `ui/axiomate-explorer/src/contracts/generated-types.ts` from the current OpenAPI.
3. Build the API client and store before implementing any feature screen.
4. Start with Ingest and Extraction Review, then move forward in user-flow order.