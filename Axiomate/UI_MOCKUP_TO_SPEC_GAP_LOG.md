# Axiomate Explorer Mockup-to-Spec Gap Log

Date: 2026-05-12
Sources:
- `Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md`
- `Axiomate/UI_MOCKUPS_HANDOFF.html`
- `Axiomate/contracts/openapi.yaml`
- `ui/axiomate-explorer/src/main.ts`
- `ui/axiomate-explorer/src/contracts/generated-types.ts`

Status legend:
- `P0`: blocks implementation handoff
- `P1`: major gap that should be closed in sprint delivery
- `P2`: follow-up hardening/polish

## Findings

| ID | Severity | Area | Gap | Evidence | Owner | Required action |
| --- | --- | --- | --- | --- | --- | --- |
| GAP-001 | P0 | Artifact structure | `UI_MOCKUPS_HANDOFF.html` contains seven full HTML documents concatenated into one file, so it is not a usable application artifact. | `<!DOCTYPE html>` appears at lines 3, 307, 670, 1049, 1433, 1839, 2235. | Frontend | Treat the file as a visual reference only. Rebuild as a routed app shell plus components in `ui/axiomate-explorer`. |
| GAP-002 | P0 | Runtime contract | The mockups are static and contain no binding to `/api/v1` endpoints or runtime models. | No `/api/v1` references in the mockup; spec requires `Session`, `PipelineRun`, `GraphSnapshot`, `ValidationReport`, `Trace`, `AttestationBundle`. | Frontend | Build a typed API client and screen-level state model directly from `Axiomate/contracts/openapi.yaml`. |
| GAP-003 | P0 | Repair workflow | Repair UX is visual only and does not expose idempotency, replay, or chained refresh behavior required by the spec. | OpenAPI requires `X-Idempotency-Key` on `/sessions/{sessionId}/repairs`; mockup has action buttons only. | Frontend | Add deterministic key derivation, replay badge, and post-repair `validate -> graph` refresh chain. |
| GAP-004 | P0 | Error handling | Global error envelope handling and user-facing retry states are not represented. | Spec requires explicit mapping for `VALIDATION_ERROR`, `GRAPH_NOT_FOUND`, `VALIDATION_NOT_FOUND`, `CONFLICT_NOT_FOUND`, `INVALID_FORMAT`, `NOT_FOUND`, `INTERNAL_ERROR`. | Frontend | Add shared error mapper, toast/banner placement rules, inline retry actions, and disabled-state copy. |
| GAP-005 | P0 | Accessibility | Core interactive controls lack implementation-ready semantics for keyboard, screen reader, and live status support. | Mockup has almost no `aria-*`, `role`, or `tabindex`; icon-only controls are unlabeled. | Frontend + Design | Add semantic navigation, labels, focus order, `aria-live="polite"`, keyboard graph fallback, and focus-visible states. |
| GAP-006 | P0 | Timeline model | The MVP requires a run timeline that survives hard refresh for the same `sessionId`, but the mockups only show local decorative timelines. | Spec locked decision: timeline must persist across refresh for same `sessionId`; mockup shows entity and verification timelines only. | Frontend | Persist `RunEvent[]` by `sessionId` in the workbench store and hydrate on load. |
| GAP-007 | P0 | Verify flow | Verify is visually present, but day-one support for pasted JSON and uploaded bundle file is not implemented in the mockup. | Mockup shows `Current Session` vs `External Bundle` toggle only; no paste/upload controls are rendered. | Frontend | Implement `VerifyInputSwitcher` with textarea, file input, validation, and preview for external bundles. |
| GAP-008 | P0 | Type safety | Current UI generated types are out of sync with the OpenAPI contract and omit required fields and models. | `ui/axiomate-explorer/src/contracts/generated-types.ts` omits `Document`, `PipelineRun`, `RepairAction`, verify request/response, diagnostics, evidence fields, and several enums. | Frontend | Regenerate or replace current generated types, then enforce additive-only contract usage from one source of truth. |
| GAP-009 | P1 | App architecture | Current UI implementation is a day-1 linear demo, not a multi-screen workbench. | `ui/axiomate-explorer/src/main.ts` creates one page, runs all API calls sequentially, and has no routing, tabs, or reusable state. | Frontend | Replace the demo flow with an app shell, route structure, store, and feature modules. |
| GAP-010 | P1 | Ingest behavior | Multi-document upload is visually represented, but queue mechanics, per-row failure states, and sample-text fallback are not wired. | Mockup shows `PARSED`, `PARSING`, `PENDING`; spec requires upload progress, remove, replace, clear queue, sample text CTA. | Frontend | Model local queue state plus server-backed document records, including optimistic row updates and retry. |
| GAP-011 | P1 | Extraction review | Extraction tables are visually strong but not mapped to actual relation enums and evidence chips from the contract. | Mockup uses relation labels such as `MANAGES`, `OWNED_BY`, `LOCATED_IN`, which do not match current API enum values. | Frontend + Design | Normalize table display to actual contract values or add a UI display mapper over the canonical relation enum set. |
| GAP-012 | P1 | Graph accessibility | The graph canvas has pan/zoom controls, but no list/table fallback for keyboard users or low-end devices. | Spec explicitly requires graph fallback representation. | Frontend | Add a synchronized entity/relation list mode and keyboard selection model tied to the inspector. |
| GAP-013 | P1 | Conflict semantics | Conflict cards and suggested actions are not bound to `ValidationReport.conflicts` and `suggestedRepairs`. | Mockup uses display IDs such as `REF-001`, `VAL-204`, `GEO-911`; OpenAPI expects `conflictId`, `code`, `severity`, `message`, `relatedIds`. | Frontend | Drive the queue and detail pane from `ValidationReport` and render suggested actions by `conflictId`. |
| GAP-014 | P1 | Attestation messaging | Trust-boundary language is present, but verification outcomes are shown only as all-pass states. | Mockup verification table shows all checks passing and no invalid/partial/error views. | Frontend | Add invalid bundle, malformed JSON, failed check, and loading states for both verify modes. |
| GAP-015 | P1 | Export gating | Feature-flagged export formats are visible but not shown as disabled with explanatory lock state. | Locked decision requires `svg`, `ttl`, `cypher` visible but disabled; mockup renders them as normal options. | Frontend + Design | Render locked options with tooltip or inline copy, and prevent submission while still advertising availability. |
| GAP-016 | P1 | Notifications | No shared toast stack, inline banner contract, or stage chip system is represented consistently across screens. | Spec defines `ToastStack`, `InlineErrorBanner`, `StageChip`, `RunTimeline`. | Frontend | Add a single notification/state surface used across the workbench. |
| GAP-017 | P2 | Asset hygiene | The mockup repeats Tailwind config, font links, and Material Symbols includes per document. | Repeated `<link>` and Tailwind config blocks throughout the file. | Frontend | Consolidate tokens and assets into shared CSS/theme modules in the actual app. |
| GAP-018 | P2 | Visual consistency | Screen naming differs between `Extraction`, `Review`, and `Extraction Review`, which will create implementation drift if not normalized. | Navigation labels differ across mockup sections. | Design + Frontend | Freeze one canonical label set before implementation. |

## Owner Summary

### Frontend
- GAP-001 through GAP-016 are primarily frontend execution work.
- Highest-risk technical items are the contract/type drift, workbench store, timeline persistence, and repair idempotency UX.

### Design
- Normalize labels, disabled/locked states, and accessibility text.
- Provide explicit copy for error banners, empty states, and trust boundary language.

### API
- No breaking contract changes are needed.
- Frontend can proceed against current `0.1.0` contract, but timeline persistence will require client-side storage until the API exposes history.

## Recommended Close Order

1. Close GAP-001, GAP-002, GAP-008, and GAP-009 before implementation starts in earnest.
2. Close GAP-003, GAP-004, GAP-006, and GAP-007 while building the shared store and client.
3. Close GAP-010 through GAP-016 as feature modules are implemented.
4. Close GAP-017 and GAP-018 during polish and review hardening.