# Axiomate Explorer - Next Agent Prompt Pack

Date: 2026-05-12
Purpose: Ready-to-run prompts for the next agent to continue review and implementation planning.

## Resolved Decisions (Locked)
- Run timeline persistence: persist across hard refresh for the same `sessionId`.
- Feature-flagged exports (`svg`/`ttl`/`cypher`): visible but disabled, with explanatory lock state.
- Verify input day-one: support both pasted JSON and uploaded bundle file.
- OpenAPI policy: `0.1.0` remains additive-only (no breaking schema changes).
- MVP API path: existing Node API at `/api/v1` is canonical for the current implementation path.

## Prompt 1 - Primary Continuation Prompt
Use this as the default prompt for the next agent.

```text
You are continuing the Axiomate Explorer UI review and implementation handoff in the RuVector repository.

Repository root:
c:\Users\GavinKnight\OneDrive - Quadtech\Documents\Ruvector\RuVector

Your objective:
Produce an implementation-ready review package by validating supplied mockup code against the MVP UI spec, then converting findings into concrete engineering/design execution artifacts.

Read these files first, in this exact order:
1) Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md
2) Axiomate/UI_MOCKUPS_HANDOFF.html
3) Axiomate/UI_MOCKUPS_REVIEW_HANDOVER.md
4) Axiomate/HANDOVER_REPORT.md
5) Axiomate/MVP_SCOPE.md
6) Axiomate/ARCHITECTURE.md
7) Axiomate/REPO_PLACEMENT.md
8) Axiomate/SPRINT_BOARD_2W.md
9) Axiomate/contracts/openapi.yaml
10) Axiomate/contracts/mcp-tools.json
11) npm/packages/axiomate-explorer-api/src/server.ts
12) ui/axiomate-explorer/src/main.ts
13) ui/axiomate-explorer/src/contracts/generated-types.ts

Constraints you must enforce:
- This is incremental evolution, not a replan.
- Preserve OpenAPI v0.1.0 additive-only policy.
- Keep architecture direction aligned with existing vertical slice.
- Prioritize trust/explainability, error UX, accessibility, and responsive behavior.
- Use API endpoints and generated types that exist now.
- Treat the locked decisions in this file as non-negotiable implementation defaults.

What to produce:
1) Mockup-to-Spec Gap Log (severity-ranked: P0/P1/P2) with file references.
2) Screen Behavior Contract table for each screen/state:
   - purpose
   - required data
   - API call sequence
   - loading/empty/error states
   - disabled/optimistic/pessimistic behavior
   - success criteria
3) Accessibility audit matrix:
   - keyboard/focus order
   - ARIA and labels
   - contrast and text alternatives
   - graph fallback/list mode requirements
4) API Error UX matrix:
   - error.code -> user message -> placement -> retry behavior
5) Run timeline contract:
   - available now vs additive proposals
   - event model for runId/runVersion/stage/status
   - persistence behavior across hard refresh keyed by sessionId
6) Implementation ticket plan:
   - mergeable increments
   - owner (Design/Frontend/API)
   - dependencies
   - acceptance criteria

Critical checks to verify:
- Multi-document ingest is exposed in MVP flow.
- Verify supports both session-generated and pasted/uploaded bundles.
- Repair flow specifies X-Idempotency-Key behavior and replay semantics.
- Feature-flagged export formats are explicitly handled in UX.
- Global notifications and error banners are standardized.
- Timeline persistence behavior is implemented for same-session hard refresh.

Output format required:
- Findings first, ordered by severity.
- Then remaining open questions (if any) and assumptions (do not relitigate locked decisions).
- Then execution plan and acceptance checklist.

Do not stop at high-level commentary; deliver concrete, testable artifacts.
```

## Prompt 2 - Focused Accessibility and Interaction Audit
Use when you want a dedicated a11y and behavior pass.

```text
Perform a focused accessibility and interaction audit for Axiomate Explorer mockups.

Inputs:
- Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md
- Axiomate/UI_MOCKUPS_HANDOFF.html
- Axiomate/UI_MOCKUPS_REVIEW_HANDOVER.md

Deliverables:
1) WCAG AA gap report by screen and component.
2) Keyboard navigation map (tab order and focus traps).
3) Required ARIA roles/attributes and screen reader labels list.
4) Graph canvas non-pointer fallback interaction design.
5) Remediation checklist with implementation snippets and priority.

Prioritize:
- icon-only controls
- timeline and table semantics
- toast/inline error announcements (aria-live)
- mobile bottom navigation and sticky footer conflicts
```

## Prompt 3 - API Binding and State Contract Pass
Use when you want strict frontend-to-API alignment verification.

```text
Validate Axiomate Explorer UI mockups against actual API/data contracts and produce a binding plan.

Inputs:
- Axiomate/contracts/openapi.yaml
- npm/packages/axiomate-explorer-api/src/server.ts
- ui/axiomate-explorer/src/contracts/generated-types.ts
- Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md
- Axiomate/UI_MOCKUPS_HANDOFF.html

Deliverables:
1) Data binding table (UI element -> type -> endpoint -> field mapping).
2) Missing/partial fields list with additive-only proposals.
3) Mutation flow diagrams:
   - extract -> graph
   - validate -> repairs -> revalidate -> graph
   - attest -> verify
   - export
4) Retry/idempotency behavior contract for repairs.
5) State machine for session/workbench phases.

Non-negotiable:
- No breaking contract recommendations.
- Clearly separate available-now vs additive improvements.
```

## Prompt 4 - Ticketization Prompt (Sprint-Ready)
Use when you want implementation work broken into actionable tickets.

```text
Convert the current Axiomate UI review findings into sprint-ready tickets.

Source files:
- Axiomate/UI_MOCKUPS_REVIEW_HANDOVER.md
- Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md
- Axiomate/SPRINT_BOARD_2W.md

Output requirements:
- Ticket IDs in AX-UI-### format.
- Each ticket includes:
  - Title
  - Why
  - Scope (in/out)
  - Files touched
  - API dependencies
  - Test requirements (component/integration/e2e)
  - Accessibility acceptance
  - Definition of done
- Group by milestone:
  - M1 foundations
  - M2 core flow
  - M3 trust/explainability
  - M4 hardening/release

Also add a critical-path dependency graph and identify blockers.
```

## Prompt 5 - Designer Collaboration Prompt
Use when handing to a human product/UX designer for final sign-off alignment.

```text
You are reviewing Axiomate Explorer mockups for production MVP readiness with strict trust/explainability requirements.

Review context:
- Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md
- Axiomate/UI_MOCKUPS_HANDOFF.html
- Axiomate/UI_MOCKUPS_REVIEW_HANDOVER.md

Please produce:
1) Final screen IA validation (route/tab/state completeness).
2) Visual consistency pass:
   - typography hierarchy
   - color/status semantics
   - component state consistency
3) UX risk list for non-technical users.
4) Revised copy deck for:
   - errors
   - verification trust boundary text
   - conflict/repair guidance
5) Designer sign-off checklist for frontend handoff.

Keep recommendations implementation-aware and aligned to existing API constraints.
```

## Suggested Run Order
1) Prompt 1 (primary continuation)
2) Prompt 3 (API/state binding)
3) Prompt 2 (accessibility and interaction)
4) Prompt 4 (ticketization)
5) Prompt 5 (designer sign-off)
