# Axiomate UI Mockups Review Handover

Date: 2026-05-12
Prepared by: GitHub Copilot (GPT-5.3-Codex)
Purpose: Hand off a structured review package so another agent can validate supplied mockup code against MVP UI spec findings.

## 1. Scope Reviewed
- Spec source: `Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md`
- Supplied code: `Axiomate/UI_MOCKUPS_HANDOFF.html`

This report evaluates implementation-readiness and alignment to MVP requirements. It is not a visual taste review.

## 2. Executive Finding
The supplied HTML is a strong visual exploration covering all major surfaces (ingest, extraction, graph, conflicts, traces, attestation, export), but it is currently a static mockup bundle rather than implementation-ready UI code.

Most critical blockers before engineering implementation:
1. Multiple full HTML documents concatenated in one file.
2. No API/data contract binding to `/api/v1` models.
3. Missing behavioral state wiring (loading/error/disabled/retry/idempotency cues).
4. Accessibility semantics are largely absent.
5. No explicit global run timeline behavior matching MVP contract requirements.

## 3. High-Priority Findings (P0)
1. `UI_MOCKUPS_HANDOFF.html` contains 7 separate `<!DOCTYPE html>` documents in one file, so it cannot operate as a single app artifact without splitting.
- Evidence: `Axiomate/UI_MOCKUPS_HANDOFF.html:3`, `Axiomate/UI_MOCKUPS_HANDOFF.html:307`, `Axiomate/UI_MOCKUPS_HANDOFF.html:670`, `Axiomate/UI_MOCKUPS_HANDOFF.html:1049`, `Axiomate/UI_MOCKUPS_HANDOFF.html:1433`, `Axiomate/UI_MOCKUPS_HANDOFF.html:1839`, `Axiomate/UI_MOCKUPS_HANDOFF.html:2235`

2. No contract-driven data bindings are present for required runtime entities (`Session`, `PipelineRun`, `GraphSnapshot`, `ValidationReport`, `Trace`, `AttestationBundle`).
- Evidence: only static copy/content and no endpoint references found in mockup.

3. Repair/idempotency workflow requirements are not represented in UI mechanics.
- Spec requires deterministic idempotency handling for repairs and replay indication.
- No visible `X-Idempotency-Key` or replay state UX mapping in supplied code.

4. Error envelope and retry UX are not represented with actionable states.
- Spec requires mapping of API error codes (`VALIDATION_ERROR`, `GRAPH_NOT_FOUND`, etc.) to user-facing banners/toasts.
- Supplied code appears to show happy-path visuals only.

## 4. Medium Findings (P1)
1. Accessibility semantics are limited.
- No meaningful `aria-*` usage detected in key interactive controls.
- Icons/buttons are largely unlabeled for screen readers.
- Keyboard/focus order and alternate graph list mode are not represented.

2. Global run timeline requirement is only partially represented.
- Timeline-like elements exist in some screens, but there is no clear app-level run timeline model tied to `runId/runVersion/stage/status` progression.

3. Repeated head assets and duplicated Google font links increase noise and implementation risk.
- Material Symbols and font links are duplicated across sections.

4. Screen naming and active-nav context are occasionally inconsistent across blocks (expected in mockups, but should be normalized before handoff to engineering).

## 5. Positive Alignment Signals (What is good)
1. Multi-document ingest is clearly exposed and visible in queue form.
- Evidence: queue rows with `PARSED`, `PARSING`, `PENDING` plus `Run Extract` action.

2. Extraction review includes KPI strip and concept/relation tables.
- Evidence: `Run Validate` and `Open Graph` CTA flow appears.

3. Graph exploration includes inspector, filters, and zoom controls.

4. Conflict workflow has queue + detail + repair action choices.

5. Trace view has timeline structure and evidence panel.

6. Attestation/verify and export screens are represented and visually coherent.
- Verify has mode switcher concept (`Current Session` vs `External Bundle`) which aligns to spec direction.

## 6. Alignment Matrix Against MVP Spec
Status legend: `Aligned`, `Partial`, `Missing`

- Ingest (multi-doc exposed): `Aligned`
- Extraction review: `Aligned`
- Graph exploration: `Aligned`
- Conflict + repair semantics: `Partial`
- Trace explanation: `Aligned`
- Attestation + dual-mode verify: `Partial` (visuals present, behavior undefined)
- Export formats and preview: `Aligned`
- Global notifications + error mapping: `Missing`
- Run timeline with pipeline event model: `Partial`
- Accessibility requirements (WCAG/ARIA/keyboard fallback): `Missing`
- Data contract mapping to OpenAPI/generated types: `Missing`

## 7. Tasks for Next Agent (Review + Action)
1. Split `UI_MOCKUPS_HANDOFF.html` into one file per screen/state (or one app shell with route sections).
2. Produce a component inventory mapping each visual block to spec components from `UI_SPEC_AXIOMATE_EXPLORER_MVP.md`.
3. Add behavioral annotation for each primary action:
- endpoint,
- request payload type,
- expected response type,
- loading/disabled/error states,
- retry rules.
4. Add explicit repair idempotency UX notes:
- key derivation,
- replay indicator,
- post-repair revalidate chain.
5. Add global run timeline contract using observed `PipelineRun` stage/status progression.
6. Add accessibility annotations per screen:
- aria labels,
- focus order,
- keyboard alternatives,
- graph fallback list/table mode.
7. Add error UX table mapping API `error.code` to exact UI messages and placement.

## 8. Required Deliverables from Next Agent
1. `Mockup-to-Spec Gap Log` with severity and owner.
2. `Screen Behavior Contract` (screen-by-screen API + state table).
3. `A11y Compliance Pass` checklist with unresolved gaps.
4. `Implementation Cut Plan` (phaseable tickets for frontend engineer).

## 9. Open Questions to Resolve During Follow-up Review
1. Should global run timeline persist across browser refresh for a session?
2. Should feature-flagged exports (`svg`, `ttl`, `cypher`) be shown disabled with explanation, or hidden?
3. Should verify support both paste and file upload in MVP day one, or staged rollout?

## 10. Recommended Review Order
1. Validate structural artifact format (split multi-document HTML issue first).
2. Validate behavior contract coverage (API/state/retry/idempotency).
3. Validate accessibility and responsive compliance.
4. Validate visual token consistency and shared design primitives.
5. Approve implementation phasing and handoff readiness.
