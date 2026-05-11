# Axiomate Explorer Screen Behavior Contract

Date: 2026-05-12
Contract baseline: `Axiomate/contracts/openapi.yaml`
UI baseline: `Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md`
Current implementation note: `ui/axiomate-explorer/src/main.ts` is a vertical-slice demo and should not be treated as the final interaction model.

## Shared Workbench State

```ts
type WorkbenchState = {
  session: Session | null;
  documents: Document[];
  graph: GraphSnapshot | null;
  validation: ValidationReport | null;
  traces: Trace[];
  attestation: AttestationBundle | null;
  verifyResult: VerifyAttestationResponse | null;
  timelineEvents: RunEvent[];
  notifications: NotificationItem[];
};
```

## Global Rules

| Concern | Contract |
| --- | --- |
| API base | Use `/api/v1` as canonical base path. |
| Mutation semantics | Confirm UI state only after server response. |
| Timeline updates | Append `runId`, `runVersion`, `stage`, `status` events after successful mutations and persist by `sessionId`. |
| Error envelope | Map `error.code` to shared banner/toast copy and per-screen inline action. |
| Retry | Non-destructive reads may retry with fresh calls. Repair retries must reuse the same idempotency key. |
| Accessibility | All status updates that change page meaning must also publish to `aria-live="polite"`. |

## 1. Landing and Ingest

Route: `/`
Purpose: create or resume a session, upload one or more documents, and trigger extraction.

### Entry state

| UI block | Source data | Notes |
| --- | --- | --- |
| App header | local health state + current session chip | Health can be a simple reachable/unreachable indicator for MVP. |
| Upload dropzone | local queue state | Accept `text/plain`, `text/markdown`, `application/pdf`. |
| Paste fallback | local draft text | Used to synthesize a markdown upload request. |
| Document queue | `Document[]` plus local upload progress | Show parsed, partial, failed, and in-flight rows. |
| Pipeline status bar | `timelineEvents` | Must survive refresh for the same session. |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Create session | `POST /sessions` | none | `Session` | Store `sessionId`, add timeline event `created`. | Only while request in flight. | Banner with retry. |
| Upload document | `POST /sessions/{sessionId}/documents` | `UploadDocumentRequest` | `Document` | Insert or update queue row from local pending to server-backed row. | Disabled if no session or row is already uploading. | Row-level error and retry. |
| Run extract | `POST /sessions/{sessionId}/extract` | `ExtractRequest` or empty body | `PipelineRun` | Add timeline event, then chain `GET /graph`. | Disabled until at least one parsed or accepted document exists. | Inline action bar error and retry. |
| Clear queue | local only until committed | none | none | Clears local draft rows not yet uploaded; server-backed rows require explicit remove behavior if later added. | Disabled while extract is running. | n/a |

### State notes

- The current contract does not expose delete/replace document endpoints, so `Remove` and `Replace` are local queue controls before upload for MVP.
- Upload progress is client-local for the first pass because the API returns only accepted document records, not streaming progress.

## 2. Extraction Review

Route: `/session/:sessionId/workbench?tab=extraction`
Purpose: summarize extraction quality and allow transition to validation or graph inspection.

### Entry data

| UI block | Source data |
| --- | --- |
| KPI strip | `GraphSnapshot.runId`, concept count, relation count |
| Concept table | `GraphSnapshot.concepts[]` |
| Relation table | `GraphSnapshot.relations[]` |
| Evidence chip | concept or relation `evidenceIds` |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Refresh graph | `GET /sessions/{sessionId}/graph` | none | `GraphSnapshot` | Replace local graph and summary. | Disabled while loading. | Inline banner with retry. |
| Run validate | `POST /sessions/{sessionId}/validate` | `ValidateRequest` or empty body | `ValidationReport` | Store validation, add timeline event, navigate or reveal conflicts state. | Disabled until graph exists. | Banner with error-code mapping. |
| Open graph | none | none | none | Navigate to graph tab without extra mutation. | Disabled until graph exists. | n/a |

### State notes

- Relation type display must be driven from the actual enum values in `openapi.yaml`, not the freeform labels used in the mockup.
- Empty graph state needs explicit guidance: no inferred entities, retry extract, or lower threshold if product later adds that control.

## 3. Graph

Route: `/session/:sessionId/workbench?tab=graph`
Purpose: browse concepts and relations, inspect metadata, and jump into traces or conflicts.

### Entry data

| UI block | Source data |
| --- | --- |
| Graph canvas | `GraphSnapshot` |
| Filters | local `GraphFilterState` |
| Inspector | selected `Concept` or `Relation` plus trace lookups |
| Fallback list/table | derived from `GraphSnapshot` |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Refresh graph | `GET /sessions/{sessionId}/graph` | none | `GraphSnapshot` | Replace graph and preserve selection if entity still exists. | Disabled while loading. | Inline retry. |
| Select entity | none | none | none | Sync canvas, inspector, and fallback list selection. | Never disabled. | n/a |
| Jump to trace | `GET /sessions/{sessionId}/traces` if traces not cached | none | `{ traces: Trace[] }` | Navigate to traces tab with target entity selected. | Disabled only while traces are loading. | Banner with retry. |
| Jump to conflict | none or use cached validation | none | none | Navigate to conflicts tab if related validation item exists. | Disabled if no related conflict can be resolved. | Tooltip explaining why unavailable. |

### State notes

- Pan, zoom, and fit controls are local view state only.
- The fallback list/table is mandatory, not optional polish.

## 4. Conflicts and Repair

Route: `/session/:sessionId/workbench?tab=conflicts`
Purpose: review validation conflicts, inspect supporting context, and apply deterministic repairs.

### Entry data

| UI block | Source data |
| --- | --- |
| Conflict queue | `ValidationReport.conflicts[]` |
| Suggested actions | `ValidationReport.suggestedRepairs[]` filtered by `conflictId` |
| Related evidence | `Conflict.relatedIds` plus graph/traces lookups |
| Repair result banner | last repair outcome + replay state |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Refresh validation | `POST /sessions/{sessionId}/validate` | `ValidateRequest` or empty body | `ValidationReport` | Replace validation and queue. | Disabled while validation is running. | Banner with retry. |
| Apply repair | `POST /sessions/{sessionId}/repairs` | `RepairAction` + header `X-Idempotency-Key` | `PipelineRun` | Show pending state, append timeline event, then chain `POST /validate` and `GET /graph`. | Disabled while a repair is in flight for the selected conflict. | Inline error plus retry with same key. |
| Skip | local only | none | none | Advances selection to next conflict without server mutation. | Disabled if no next conflict. | n/a |
| Copy conflict details | local only | none | none | Copies canonical conflict data to clipboard. | Never disabled. | Toast if clipboard fails. |

### Idempotency contract

- Key format: `repair-{sessionId}-{conflictId}-{actionType}-{payloadHash}`
- `payloadHash` should be a stable hash of the serialized repair payload.
- If the server responds from cache or the client knows it reused a key, surface `Replay detected` in the repair result banner.

## 5. Traces

Route: `/session/:sessionId/workbench?tab=traces`
Purpose: explain why concepts, relations, or validation outcomes exist.

### Entry data

| UI block | Source data |
| --- | --- |
| Trace list | `Trace[]` |
| Timeline | selected `Trace.steps[]` |
| Evidence panel | `TraceStep.inputEvidenceIds[]` resolved via lookups |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Load traces | `GET /sessions/{sessionId}/traces` | none | `{ traces: Trace[] }` | Cache traces and populate list. | Disabled while loading. | Banner with retry. |
| Select trace | none | none | none | Update timeline and evidence panel. | Never disabled. | n/a |
| Jump to graph entity | none | none | none | Navigate to graph tab with entity selected. | Disabled if graph is missing. | Offer refresh graph. |
| Copy trace JSON | local only | none | none | Copy canonical trace object. | Never disabled. | Toast on clipboard failure. |

### State notes

- Empty state should distinguish between `no traces available yet` and `traces could not be loaded`.
- The current mockup includes a `Re-run Extraction` button, but this should not appear unless product explicitly wants a quick action back to ingest/extract.

## 6. Attestation

Route: `/session/:sessionId/workbench?tab=attestation`
Purpose: generate an attestation bundle for the current session.

### Entry data

| UI block | Source data |
| --- | --- |
| Generation card | local readiness state from graph and traces availability |
| Bundle summary | `AttestationBundle` |
| Trust boundary callout | static content from spec |
| Verification log | `timelineEvents` filtered to attestation/verify actions |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Generate attestation | `POST /sessions/{sessionId}/attest` | none | `AttestationBundle` | Cache bundle, append timeline event, unlock current-session verify mode. | Disabled until graph exists and traces are available. | Banner with retry. |
| Copy hashes | local only | none | none | Copies graph/evidence/trace hashes. | Disabled until attestation exists. | Toast on clipboard failure. |
| Copy bundle JSON | local only | none | none | Copies serialized attestation. | Disabled until attestation exists. | Toast on clipboard failure. |

## 7. Verify

Route: `/session/:sessionId/verify`
Purpose: verify the current session bundle or an arbitrary pasted/uploaded bundle.

### Entry data

| UI block | Source data |
| --- | --- |
| Input mode switcher | local verify mode: `current-session` or `external` |
| Current session bundle | `AttestationBundle | null` |
| External JSON textarea/file input | local draft payload |
| Checks table | `VerifyAttestationResponse` |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Verify current session | `POST /attestations/verify` | `VerifyAttestationRequest` built from cached attestation | `VerifyAttestationResponse` | Render checks table and validity summary. | Disabled if no current attestation exists. | Inline error and retry. |
| Verify external bundle | `POST /attestations/verify` | `VerifyAttestationRequest` built from pasted/uploaded JSON | `VerifyAttestationResponse` | Render checks table and source summary. | Disabled until parsed JSON validates locally. | Local parse error or server error mapped clearly. |
| Upload bundle file | local only | file -> parsed JSON | none | Hydrate external draft payload and preview. | Disabled while file is parsing. | Field-level invalid JSON message. |

### State notes

- Trust boundary language must always remain visible regardless of pass/fail.
- Invalid verification results need explicit styling distinct from malformed request payloads.

## 8. Export

Route: `/session/:sessionId/workbench?tab=export`
Purpose: preview and download export artifacts for the current graph.

### Entry data

| UI block | Source data |
| --- | --- |
| Format selector | local format selection over `json`, `txt`, `svg`, `ttl`, `cypher` |
| Locked formats | feature flag metadata |
| Preview | export response `{ format, artifact, attestationId }` |
| Attestation reference | `attestationId` or local attestation state |

### Actions

| Action | Endpoint | Request | Response | Success behavior | Disabled rule | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Export | `GET /sessions/{sessionId}/export?format={format}` | query string only | `{ format, artifact, attestationId? }` | Render preview and enable copy/download. | Disabled until graph exists. Locked formats stay visible but non-interactive. | Inline error and retry. |
| Copy artifact | local only | none | none | Copies current artifact text. | Disabled until preview exists. | Toast on clipboard failure. |
| Download artifact | local only | none | none | Saves preview to file with matching extension. | Disabled until preview exists. | Toast on download failure. |

### Locked-format behavior

- `svg`, `ttl`, and `cypher` must be listed in the selector.
- Locked options must be disabled and show explanatory copy such as `Available after feature flag enablement`.

## 9. Global Notifications and Timeline

### Notification placement

| Event type | Surface |
| --- | --- |
| Request validation or parse errors | inline field error plus top-of-panel banner |
| Recoverable read failure | inline banner in the affected screen |
| Successful long-running mutation | toast plus timeline update |
| Repair replay | repair result banner in conflicts plus optional toast |

### Error code mapping

| `error.code` | UI message |
| --- | --- |
| `VALIDATION_ERROR` | Some inputs are invalid. Check the highlighted fields and try again. |
| `INVALID_JSON` | The supplied JSON could not be parsed. Review the bundle and retry. |
| `GRAPH_NOT_FOUND` | No graph is available yet. Run extraction first. |
| `VALIDATION_NOT_FOUND` | Validation has not been run for this session yet. |
| `CONFLICT_NOT_FOUND` | This conflict is no longer current. Refresh validation. |
| `INVALID_FORMAT` | This export format is not available in the current build. |
| `NOT_FOUND` | The requested session or route could not be found. |
| `INTERNAL_ERROR` | The server returned an unexpected error. Retry the action. |

### Timeline event schema

```ts
type RunEvent = {
  sessionId: string;
  runId?: string;
  runVersion?: number;
  stage: "extract" | "graph" | "validate" | "repair" | "attest" | "export" | "session" | "upload" | "verify";
  status: string;
  label: string;
  createdAt: string;
  replayed?: boolean;
};
```

Persist `RunEvent[]` in local storage keyed by `sessionId` until a server-side history endpoint exists.