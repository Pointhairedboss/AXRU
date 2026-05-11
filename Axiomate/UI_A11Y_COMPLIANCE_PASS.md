# Axiomate Explorer Accessibility Compliance Pass

Date: 2026-05-12
Assessment target: `Axiomate/UI_MOCKUPS_HANDOFF.html`
Reference baseline: `Axiomate/UI_SPEC_AXIOMATE_EXPLORER_MVP.md`

Status legend:
- `Pass`: acceptable in current handoff
- `Partial`: direction exists but implementation work is still required
- `Fail`: missing from handoff or contradicted by current artifact

## Global Checklist

| Requirement | Status | Current evidence | Required change |
| --- | --- | --- | --- |
| Page language defined | Pass | Each mockup document uses `lang="en"`. | Preserve in routed app shell. |
| Semantic page structure | Partial | Uses `header`, `main`, `section`, `aside`, `footer`. | Keep landmarks unique per route and avoid duplicate nested landmarks after composition. |
| Keyboard operation for all actions | Fail | Controls are visually buttons/links but no keyboard interaction model is described for graph, tabs, or action bars. | Define tab order, roving tabindex where needed, and keyboard shortcuts only as enhancement. |
| Visible focus state | Partial | Tailwind hover states exist; explicit `focus-visible` is largely absent. | Add consistent `focus-visible` tokens to all interactive controls. |
| ARIA labels for icon-only controls | Fail | Health, settings, close, filter, zoom, and support icons are unlabeled. | Add `aria-label` or visible text for every icon-only button. |
| Live status announcements | Fail | No `aria-live` region in mockups. | Add a polite live region for status, validation, repair, verify, and export updates. |
| Error identification and recovery | Fail | Happy-path visuals dominate; no screen-level error treatment is rendered. | Provide inline field errors, top-of-panel banners, and retry actions. |
| Contrast baseline | Partial | Palette is generally strong, but contrast has not been verified against all state combinations. | Validate tokens against WCAG AA for default, disabled, hover, and text-on-badge combinations. |
| Reduced motion support | Fail | Motion is implied via hover/transition classes only; no reduced-motion strategy. | Gate animations under `prefers-reduced-motion`. |
| Graph fallback representation | Fail | Only canvas and inspector views are shown. | Add synchronized list/table mode for graph entities and relations. |
| Form label association | Partial | Some fields have visible labels, but not all inputs are explicitly linked. | Use `label for`/`id` or wrapped labels consistently. |
| Image handling | Partial | Several images include `alt`, but many appear decorative and should likely be hidden from assistive tech. | Mark decorative imagery with empty `alt` or `aria-hidden="true"`; keep meaningful evidence previews accessible. |

## Screen-by-Screen Pass

### Ingest

| Check | Status | Gap |
| --- | --- | --- |
| Dropzone accessible by keyboard | Fail | Mockup presents a visual dropzone with no button/input pairing. |
| Paste textarea labeled | Partial | Visible label exists, but implementation needs explicit association and validation messaging. |
| Queue status announced | Fail | `PARSED`, `PARSING`, `PENDING` badges are visual only. |
| Footer action bar usable on mobile | Partial | Mobile nav is present, but sticky action semantics and focus order are undefined. |

### Extraction Review

| Check | Status | Gap |
| --- | --- | --- |
| Tables expose headers semantically | Partial | Visual tables are present; implementation must preserve proper `<th scope>` structure. |
| Confidence coding not color-only | Partial | Text values exist alongside color, which is good. Need consistent badge text in final app. |
| Filters accessible | Fail | Filter/download icons in table headers are unlabeled. |
| Empty/error states | Fail | Only populated happy-path tables are shown. |

### Graph

| Check | Status | Gap |
| --- | --- | --- |
| Canvas controls labeled | Fail | Zoom and fit buttons rely on title only or no explicit accessible name contract. |
| Node/edge selection keyboard support | Fail | No keyboard model is described. |
| Inspector synchronization | Partial | Inspector is visually present but lacks announced selection changes. |
| Non-canvas fallback | Fail | Required list/table fallback is absent. |

### Conflicts

| Check | Status | Gap |
| --- | --- | --- |
| Conflict queue readable by severity | Partial | Severity labels include text, not just color. |
| Suggested repair actions clearly named | Pass | Buttons have visible text labels. |
| Repair outcome announced | Fail | No live update or result banner contract is shown. |
| Evidence panel structure | Partial | Evidence cards are readable, but step association needs accessible relationships. |

### Traces

| Check | Status | Gap |
| --- | --- | --- |
| Trace list searchable by keyboard | Partial | Search field exists, but no result/selection announcement is defined. |
| Timeline readable without layout dependence | Partial | Step cards have headings and values; the vertical line is decorative only. |
| Evidence panel linked to selected step | Fail | Current mockup does not expose programmatic association between selected step and evidence. |
| Copy and jump actions accessible | Fail | Actions are described in spec but not fully represented in the mockup. |

### Attestation and Verify

| Check | Status | Gap |
| --- | --- | --- |
| Mode switcher is accessible tabs or segmented control | Fail | Visual toggle only; no tab/pressed semantics defined. |
| Verification results readable as table | Partial | Table structure exists, but pass/fail icons need accessible text and error variants. |
| Trust boundary language visible | Pass | Trust notice is clearly rendered in the mockup. |
| External bundle input | Fail | Required paste/upload controls are absent. |

### Export

| Check | Status | Gap |
| --- | --- | --- |
| Format selector exposes disabled locked options | Fail | Beta/flagged formats are selectable rather than visibly locked. |
| Artifact preview usable by assistive tech | Partial | Preview uses `<pre><code>`, which is good; copy/download actions need labels and status messages. |
| Toggle for attestation inclusion accessible | Fail | Rendered as a visual switch with no semantic input role. |
| Export queue status | Fail | Side queue is visual only and not tied to a live region or status role. |

## Unresolved Gaps To Close Before MVP Sign-off

1. Add a shared accessibility baseline to the real app shell: labels, focus-visible styles, live region, and reduced-motion handling.
2. Replace purely visual segmented controls and switches with semantic inputs or ARIA-compliant patterns.
3. Provide keyboard-first interaction for graph exploration, including a fallback entity/relation list.
4. Add explicit empty, loading, invalid, and retry states to every screen.
5. Audit all icon-only controls and decorative images after componentization, not in the raw mockup artifact.

## Minimum Acceptance Checklist

- All tabs, buttons, selectors, and icon controls have accessible names.
- Focus order follows the visual reading order on desktop, tablet, and mobile layouts.
- Status changes are announced through a polite live region.
- Graph interactions are fully possible without pointer input.
- Verify supports keyboard-driven paste and file upload flows.
- Export locked formats are announced as unavailable rather than silently disabled.
- Contrast and focus styles pass WCAG AA in all major states.