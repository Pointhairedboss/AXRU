# Axiomate Explorer — Master Architecture Plan

**Version:** 1.0  
**Date:** May 11, 2026  
**Status:** Approved for implementation  

---

## Agent 1 — UI Concept

### Recommended UI Framework

**SvelteKit** — identical to `ui/ruvocal/`. New app at `ui/axiomate/`.

Do not embed Axiomate inside `ruvocal`. Ruvocal is a chat interface with its own auth, session model, and MCP-bridge wiring. Axiomate Explorer is a knowledge-graph workbench — a distinct product with a different mental model. Shared code goes in a new `ui/shared/` lib rather than coupling the two apps.

### UI Structure

```
ui/axiomate/
  src/
    routes/
      +layout.svelte          # top nav: Upload | Graph | Conflicts | Trace | Export
      +page.svelte            # landing / upload drop-zone
      graph/+page.svelte      # interactive concept graph
      conflicts/+page.svelte  # conflict list + resolution panel
      trace/[id]/+page.svelte # per-concept reasoning trace
      export/+page.svelte     # attestation report + download
    lib/
      components/
        GraphCanvas.svelte    # wraps Cytoscape.js or D3 force graph
        ConceptPanel.svelte   # concept detail flyout
        ConflictCard.svelte   # conflict pair side-by-side
        TraceTree.svelte      # expandable derivation tree
        UploadZone.svelte     # drag-and-drop + paste
      stores/
        session.ts            # writable store: concepts, edges, conflicts, trace
        graph.ts              # derived store: filtered/rendered graph state
      api/
        client.ts             # typed fetch wrapper over /axiomate/* routes
      types/
        axiomate.ts           # Concept, Relation, Conflict, TraceNode, Report types
  static/
  package.json
  svelte.config.js
  vite.config.ts
```

### Graph Visualization

- **Cytoscape.js** for the knowledge graph (better for semantic graphs than D3 Force, handles 500+ nodes gracefully, first-class edge labeling, compound nodes for consistency zones).
- Color-code edges: `subsumes` = blue, `requires` = green, `conflicts_with` = red, `related_to` = grey.
- Consistency zones rendered as compound/background shading (green = safe, amber = review, red = conflict).
- Entry-point concepts (depth=0, per System A Rule 5) pinned at top of layout.
- Click-to-inspect opens `ConceptPanel` flyout showing: definition, source quote, depth, confidence, and derivation chain.

### User Journey

```
1. Drop document → parse → concept list preview
2. Click "Build Graph" → force layout renders
3. Conflict badge on nav bar → conflicts panel
4. Click any node/edge → reasoning trace opens in side panel
5. "Export Report" → downloads JSON + plain-text attestation
```

---

## Agent 2 — MVP Scope

The MVP scope is defined in `Axiomate/MVP_SCOPE.md`. Key anchor points for architecture:

| # | Feature | Backend Location | Complexity |
|---|---------|-----------------|------------|
| 1 | Document Ingest | `axiomate-engine/ingest` | Low |
| 2 | Concept Extraction | `axiomate-engine/concept_extractor` | Medium |
| 3 | Relation Extraction | `axiomate-engine/relation_extractor` | Medium |
| 4 | Graph Visualization | `ui/axiomate` (Cytoscape) | Medium |
| 5 | Conflict Detection | `axiomate-engine/conflict_detector` | Medium |
| 6 | Reasoning Trace | `axiomate-engine/tracer` | Low |
| 7 | Attestation Report | `axiomate-engine/attestation` | Low |

MVP is deliberately session-scoped (no auth, no persistence, in-memory only). This lets us skip the Firestore adapter entirely for sprint 1.

---

## Agent 3 — Tech Stack and Repo Placement

### Recommended Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI | SvelteKit + Cytoscape.js + Tailwind | Same as ruvocal; reuse toolchain |
| API transport | Axum REST + JSON SSE | Already the pattern in mcp-brain-server |
| API backend | New route module in `mcp-brain-server` (`axiomate.rs`) | Avoid new binary for MVP; reuse Axum state, CORS, auth infra |
| Core engine | New Rust crate `crates/axiomate-engine/` | Clean separation; testable without HTTP |
| Graph structure | Reuse `ruvector-dag` `QueryDag` | DAG traversal, topological iteration already implemented |
| Graph partitioning | Reuse `ruvector-mincut` `DynamicMinCut` | Already wired in mcp-brain `graph.rs`; consistency zones map directly to min-cut partitions |
| Symbolic reasoning | Reuse `mcp-brain-server/src/symbolic.rs` `GroundedProposition` | Predicate + arguments + confidence + evidence chain = exactly what concept extraction needs |
| Similarity search | Reuse `ruvector-solver` (PPR) + `micro-hnsw-wasm` | Equivalence class detection (Rule 2) via vector similarity |
| Text extraction | `lopdf` crate (PDF) + stdlib (text/md) | Pure Rust, no subprocess |
| NLP / concept extraction | `lindera` (tokenizer) + custom regex over System A patterns | No heavy ML for MVP; pattern-based is sufficient and explainable |
| Data storage | `HashMap<SessionId, AxiomateSession>` in `Arc<RwLock<>>` | In-memory, session-scoped per MVP constraints |
| Export | `serde_json` + template string | Already available everywhere |

### Repo Placement

```
crates/
  axiomate-engine/              ← NEW: core extraction + reasoning engine
    Cargo.toml
    src/
      lib.rs
      types.rs                  # Concept, Relation, Conflict, Trace, Session
      ingest.rs                 # parse txt/pdf/md → sentences
      concept_extractor.rs      # frequency + pattern → Vec<Concept>
      relation_extractor.rs     # System A patterns → Vec<Relation>
      conflict_detector.rs      # consistency zone algorithm (Rule 7)
      tracer.rs                 # derivation tree per concept/edge
      attestation.rs            # proof/report generator
      graph_adapter.rs          # wraps ruvector-dag QueryDag
      rules/
        mod.rs
        system_a.rs             # encodes System A Rules 1–25 as Rust types/predicates
        system_b.rs             # encodes System B memory class rules
    tests/

  mcp-brain-server/src/
    axiomate.rs                 ← NEW: HTTP route handlers for /axiomate/*
    axiomate_session.rs         ← NEW: session store (HashMap in AppState)
    (all other files unchanged)

ui/
  axiomate/                     ← NEW: SvelteKit knowledge workbench
    src/...
    package.json
    svelte.config.js

Axiomate/
  AxiomaticrulesVX.md           (existing)
  MVP_SCOPE.md                  (existing)
  ARCHITECTURE.md               (this file)
```

### Extending `mcp-brain-server` AppState

Add to `types.rs`:
```rust
pub struct AppState {
    // ... existing fields ...
    pub axiomate_sessions: Arc<RwLock<HashMap<Uuid, axiomate_engine::Session>>>,
}
```

Add to `routes.rs`:
```rust
.nest("/axiomate", axiomate::router())
```

This is zero-disruption to existing brain routes.

### Layer Map

| MVP Layer | Repo Path | Key Existing Reuse |
|-----------|-----------|-------------------|
| UI layer | `ui/axiomate/` | SvelteKit build toolchain from ruvocal |
| API layer | `crates/mcp-brain-server/src/axiomate.rs` | Axum, CORS, AppState, SSE |
| Runtime layer | `crates/axiomate-engine/` | ruvector-dag, ruvector-mincut |
| Reasoning layer | `axiomate-engine/src/rules/` + `symbolic.rs` | GroundedProposition from mcp-brain symbolic.rs |
| Proof layer | `axiomate-engine/src/attestation.rs` | serde_json, trace chain from tracer.rs |
| Data / adapter | In-memory HashMap (MVP); Firestore (V2) | Firestore already in mcp-brain-server |

---

## Agent 4 — Technical Architecture

### System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (ui/axiomate)                                       │
│  SvelteKit + Cytoscape.js                                    │
│  session.ts store owns: concepts[], edges[], conflicts[],   │
│  trace tree, report                                          │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP REST + JSON (SSE for streaming extraction)
┌──────────────▼──────────────────────────────────────────────┐
│  API Layer (mcp-brain-server /axiomate/*)                    │
│  POST /axiomate/sessions          → create session, get ID  │
│  POST /axiomate/sessions/:id/ingest → stream parse progress │
│  POST /axiomate/sessions/:id/extract → run full pipeline    │
│  GET  /axiomate/sessions/:id/graph  → full graph JSON       │
│  GET  /axiomate/sessions/:id/conflicts → conflict list      │
│  GET  /axiomate/sessions/:id/trace/:cid → trace for concept │
│  GET  /axiomate/sessions/:id/report → attestation JSON      │
│  PATCH /axiomate/sessions/:id/conflicts/:cid/resolve        │
│  DELETE /axiomate/sessions/:id    → clean up session        │
└──────────────┬──────────────────────────────────────────────┘
               │ function calls (same process)
┌──────────────▼──────────────────────────────────────────────┐
│  axiomate-engine (Rust crate)                                │
│  ┌──────────┐ ┌───────────────┐ ┌─────────────────────────┐ │
│  │ ingest   │→│concept_extract│→│ relation_extractor      │ │
│  └──────────┘ └───────────────┘ └────────────┬────────────┘ │
│                                               ↓             │
│  ┌──────────────────┐   ┌───────────────────────────────┐   │
│  │ conflict_detector│←──│ graph_adapter (ruvector-dag)  │   │
│  └────────┬─────────┘   └───────────────────────────────┘   │
│           ↓                                                   │
│  ┌────────────────────┐   ┌──────────────────────────────┐  │
│  │ tracer             │   │ attestation                  │  │
│  └────────────────────┘   └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Existing RuVector crates (reused, unmodified)              │
│  ruvector-dag   │ ruvector-mincut │ ruvector-solver         │
│  mcp-brain symbolic.rs (GroundedProposition type)           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow — Full Extraction Pipeline

```
User uploads file
       ↓
POST /axiomate/sessions/:id/ingest
       ↓
ingest.rs → strip binary, sentence-tokenize → Vec<Sentence>
       ↓
concept_extractor.rs
  • regex: detect definition patterns ("X is defined as", "X ≡ Y", "Let X =")
  • freq-weighted noun phrase extraction (bigrams/trigrams)
  • entry-point detection: Rule 5 (depth=0 candidates = top-freq terms with no parent)
  → Vec<Concept> { id, label, freq, source_sentence_ids, depth_estimate, confidence }
       ↓
relation_extractor.rs
  • pattern matcher over System A relation vocabulary:
    subsumes:     "X is a type of Y", "X ⊇ Y", "X is a subclass of Y"
    requires:     "X requires Y", "X depends on Y", "X assumes Y"
    conflicts:    "X contradicts Y", "X ∧ ¬Y", "not X but Y"
    equivalent:   "X ≡ Y", "also known as", "i.e."
  • for each matched pattern → emit Relation { source, target, kind, rule_id, sentence_id }
       ↓
graph_adapter.rs
  • insert concepts as DAG nodes (ruvector-dag QueryDag)
  • insert relations as directed edges
  • compute depth via topological iteration (TopologicalIterator)
  → AxiomateGraph { QueryDag, depth_map, entry_points }
       ↓
conflict_detector.rs
  • Rule 7 (Consistency Zones): mincut partition → connected components
  • Check: does (A subsumes B) AND (B subsumes A) exist? → circular → HIGH conflict
  • Check: same concept, two different definitions → MEDIUM conflict
  • Check: relation (A, conflicts_with, B) in source text → flag both
  → Vec<Conflict> { a, b, kind, severity, sentences }
       ↓
tracer.rs
  • for each Concept: TraceNode { concept_id, source_sentence, rule_applied, confidence }
  • for each Relation: TraceNode { src, tgt, pattern_name, rule_id, sentence }
  → HashMap<ConceptId, TraceChain>
       ↓
attestation.rs
  • Summary: total concepts, total relations, conflict count, severity distribution
  • GroundedProposition list (reusing mcp-brain-server symbolic.rs type)
  • Traceability: every claim links to source_sentence_id
  → AttestationReport { json, text, generated_at }
```

### State Model

```rust
pub struct AxiomateSession {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub raw_text: String,
    pub sentences: Vec<Sentence>,
    pub concepts: Vec<Concept>,
    pub relations: Vec<Relation>,
    pub graph: AxiomateGraph,      // wraps ruvector-dag QueryDag
    pub conflicts: Vec<Conflict>,
    pub traces: HashMap<ConceptId, TraceChain>,
    pub report: Option<AttestationReport>,
    pub phase: ExtractionPhase,    // Idle | Ingested | Extracted | Complete
}
```

Sessions live in `Arc<RwLock<HashMap<Uuid, AxiomateSession>>>` inside `AppState`.  
TTL: evict after 2 hours via background tokio task. No persistence for MVP.

### Validation and Repair Cycle

Implements System B's four-phase control loop as an async pipeline:

1. **Validate phase**: run `conflict_detector` over the freshly-built graph
2. **Repair suggestions**: for each conflict, generate candidate resolutions:
   - Circular subsumption → suggest equivalence merge (Rule 13)
   - Multi-definition → flag as disambiguation candidate (Rule 6 Interference Regions)
   - Explicit contradiction → surface both statements for user choice
3. **User action**: frontend sends `PATCH /axiomate/sessions/:id/conflicts/:id/resolve` with chosen resolution
4. **Re-validate**: re-run conflict detector after each resolution — cycle until zero conflicts or user defers

### Concept and Relation Representation

Maps directly from System A:

```rust
pub struct Concept {
    pub id: Uuid,
    pub label: String,
    pub domain: Option<String>,
    pub depth: u32,                   // Rule 5: 0 = entry point
    pub confidence: f64,              // 0.0–1.0
    pub equivalence_class: Vec<Uuid>, // Rule 2
    pub source_sentences: Vec<usize>, // indices into session.sentences
    pub stability_index: f64,         // Rule 25: |∂R(c)| / δ(c)
}

pub struct Relation {
    pub id: Uuid,
    pub source: Uuid,
    pub target: Uuid,
    pub kind: RelationKind,           // Subsumes | Requires | ConflictsWith | RelatedTo | Equivalent
    pub rule_id: &'static str,        // e.g. "A3" (Rule 3 subsumption)
    pub source_sentence: usize,
    pub confidence: f64,
}
```

### Reasoning Trace Generation

Each extraction step logs its rule application. The `tracer.rs` collects these into a derivation tree:

```
ConceptExtracted("Risk Management")
  └─ rule: "high-frequency noun phrase"
  └─ sentence: "Risk Management is discussed in Chapter 3..."
  └─ confidence: 0.84

RelationInferred(subsumes: "Risk Management" → "Risk Identification")
  └─ rule: "subsumption pattern A3"
  └─ pattern: "X is a type of Y"
  └─ sentence: "Risk Identification is a type of Risk Management activity"
  └─ confidence: 0.91
```

This trace feeds both the UI's expandable `TraceTree.svelte` and the attestation report.

### Proof / Attestation Flow

The attestation report (Feature 7) maps to `GroundedProposition` from `symbolic.rs`:

```rust
// Reuses mcp-brain-server type directly:
GroundedProposition {
    predicate: "subsumes",
    arguments: ["Risk Management", "Risk Identification"],
    confidence: 0.91,
    evidence: [sentence_uuid],  // traceable to document source
}
```

The `AttestationReport` wraps a `Vec<GroundedProposition>` plus metadata. This means the attestation output is natively compatible with the brain-server's existing memory format — enabling future `POST /v1/memories` injection from Axiomate output.

### Failure Modes

| Failure | Detection | Behavior |
|---------|-----------|----------|
| PDF parse failure | `lopdf` returns `Err` | Return 422 with "Unsupported PDF format; try copy-paste as text" |
| Zero concepts extracted | `concepts.len() == 0` | Return 200 with warning; show prompt to user to paste raw text |
| Circular subsumption loop | Cycle detection in QueryDag | Flag as HIGH conflict; do not infinite-loop in repair cycle |
| Session not found | `HashMap::get` returns `None` | 404; UI redirects to upload page |
| Extraction takes >10s | tokio timeout | SSE stream emits `event: timeout`; partial results returned |
| Mincut partition fails | graceful fallback | Skip zone coloring; log; continue with flat graph |

---

## Agent 5 — Implementation Plan

### Phase 1: Foundation (Sprint 1, ~8–9 days)

#### Task 1.1 — Scaffold `axiomate-engine` crate (1 day)

- Create `crates/axiomate-engine/Cargo.toml` with deps: `uuid`, `chrono`, `serde`, `lopdf`, `lindera-tokenizer`, `ruvector-dag`, `ruvector-mincut`
- Add to root `Cargo.toml` workspace members
- Define types: `Concept`, `Relation`, `Conflict`, `TraceNode`, `Session`, `ExtractionPhase`
- **Depends on:** nothing (greenfield)
- **Acceptance:** `cargo build` passes; no existing crates broken

#### Task 1.2 — Implement `ingest.rs` (1 day)

- `parse_text(raw: &str) -> Vec<Sentence>`
- `parse_pdf(bytes: &[u8]) -> Result<Vec<Sentence>>` using `lopdf`
- `parse_markdown(raw: &str) -> Vec<Sentence>`
- Strip formatting, normalize whitespace
- **Depends on:** 1.1
- **Acceptance:** Unit test with SWEBOK sample text extracts ≥100 sentences; PDF with 2 pages parses cleanly

#### Task 1.3 — Implement `concept_extractor.rs` (1.5 days)

- Frequency-weighted noun phrase extraction
- Definition pattern regex: "X is defined as", "Let X =", "X ≡ Y", "X refers to"
- Entry point detection (depth=0 = no parent defined in text)
- Assign confidence by: explicit_definition=0.95, high_freq=0.7, low_freq=0.5
- **Depends on:** 1.2
- **Acceptance:** Test on `Axiomate/AxiomaticrulesVX.md` extracts ≥80% of named rules/concepts

#### Task 1.4 — Implement `relation_extractor.rs` (1.5 days)

- Pattern bank for all 4 relation kinds from MVP_SCOPE Feature 3
- Output `Relation` with `rule_id` linking to System A axiom
- **Depends on:** 1.3
- **Acceptance:** Test with explicit "subsumes/requires/conflicts" sentences; ≥90% match rate on labeled test set

#### Task 1.5 — Implement `graph_adapter.rs` + `conflict_detector.rs` (1 day)

- Wrap `ruvector-dag::QueryDag`; insert concepts as nodes, relations as edges
- Run `TopologicalIterator` to assign depth
- Conflict detection: circular subsumption check + interference region detection (Rule 6)
- Partition via `ruvector-mincut` for consistency zones
- **Depends on:** 1.4
- **Acceptance:** Given 3 concepts with circular subsumption → detects 1 HIGH conflict

#### Task 1.6 — Implement `tracer.rs` + `attestation.rs` (0.5 day)

- Collect rule application logs during extraction into `TraceChain`
- `AttestationReport::generate(session) -> Report` — enumerate concepts, relations, conflicts, confidence stats
- Reuse `GroundedProposition` from `mcp-brain-server/src/symbolic.rs` (add as a dep or copy the struct)
- **Depends on:** 1.5
- **Acceptance:** Report for 50-concept session generated in <100ms; all claims have `source_sentence_id`

#### Task 1.7 — Add `/axiomate/*` routes to mcp-brain-server (1 day)

- New `axiomate.rs` and `axiomate_session.rs` in `crates/mcp-brain-server/src/`
- Wire `axiomate_sessions: Arc<RwLock<HashMap<Uuid, Session>>>` into `AppState`
- Implement 9 routes listed in the API layer design above
- SSE stream for ingest progress (chunked text → sentence count updates)
- TTL eviction background task (2h)
- **Depends on:** 1.6
- **Acceptance:** `curl POST /axiomate/sessions` returns session ID; upload test file → extract → get graph JSON

#### Task 1.8 — Scaffold `ui/axiomate/` SvelteKit app (1 day)

- Copy structure from `ui/ruvocal/` (`package.json`, `svelte.config.js`, `tailwind.config`)
- Implement `session.ts` store and `client.ts` API wrapper
- Basic upload page (`UploadZone.svelte`) — text paste + file upload
- Wire to `/axiomate/sessions` and `/axiomate/sessions/:id/extract`
- **Depends on:** 1.7
- **Acceptance:** Upload plain text → API call → receive concept list in browser console

---

### Phase 2: Visualization + Conflicts (Sprint 2, ~7 days)

#### Task 2.1 — Graph canvas with Cytoscape.js (2 days)

- `GraphCanvas.svelte` — mount Cytoscape, ingest graph JSON, force layout
- Color coding, zoom/pan, node click → opens `ConceptPanel.svelte`
- Entry points pinned top; consistency zones as compound nodes (green/amber/red)
- **Depends on:** 1.8 + 1.7
- **Acceptance:** 50-node graph renders in <2s; click any node → flyout shows definition + confidence

#### Task 2.2 — Conflict panel UI (1 day)

- `ConflictCard.svelte` — side-by-side conflicting sentences, severity badge
- "Resolve" actions: pick A, pick B, merge as equivalent
- `PATCH /axiomate/sessions/:id/conflicts/:cid/resolve` endpoint
- **Depends on:** 2.1
- **Acceptance:** Circular subsumption shown prominently; user can mark resolved; graph re-renders

#### Task 2.3 — Reasoning trace UI (1 day)

- `TraceTree.svelte` — expandable derivation tree in side panel
- Triggered by right-click on concept/edge or "Why?" button
- **Depends on:** 2.1
- **Acceptance:** Click "Risk Management" → trace shows extraction rule + source sentence

#### Task 2.4 — Attestation export (0.5 day)

- Export page: show summary stats, "Download JSON" + "Download Text"
- **Depends on:** 2.3
- **Acceptance:** Downloaded JSON parses correctly; all claims traceable to source

#### Task 2.5 — Integration tests + error handling (1.5 days)

- E2E test: upload PDF → extract → verify graph + conflicts JSON shape
- Error state UIs: parse failure, zero concepts, timeout
- **Depends on:** 2.4
- **Acceptance:** All 7 must-have features pass acceptance criteria from MVP_SCOPE.md

#### Task 2.6 — Performance validation (1 day)

- Benchmark: 5 MB file → extract in <5s
- 100-node graph renders in <2s
- Conflict detection completes in <500ms
- **Depends on:** 2.5

---

### Dependencies Graph

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8
                                            ↓
                                   2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
```

No circular dependencies. Backend (Tasks 1.1–1.7) can partially overlap with initial scaffold of Task 1.8.

### Minimal Demo Path

To get to a working demo fastest: **1.1 → 1.2 → 1.3 → 1.7 (partial: ingest + extract routes only) → 1.8 (text upload + concept list)** — approximately 5 days of work produces a browser page that accepts a text paste and returns an extracted concept list. Graph and conflict UI are layer 2.

### Testing Plan

| Scope | Tool | When |
|-------|------|------|
| Unit: concept/relation extraction | `cargo test` | Per task |
| Unit: conflict detection | `cargo test` | Task 1.5 |
| API integration | `reqwest` test or `hurl` scripts | Task 1.7 |
| UI component | Playwright `ui/axiomate` | Sprint 2 |
| Performance | Criterion bench or `/bench` scripts | Task 2.6 |

Test fixtures: use `Axiomate/AxiomaticrulesVX.md` as the canonical labeled test document (concepts and relations are explicitly named; ground truth is known).

### Milestones

| Milestone | Tasks | Goal |
|-----------|-------|------|
| M1: API boots | 1.1–1.7 | `/axiomate/sessions` working end-to-end |
| M2: Browser demo | 1.8 + 2.1 | Upload text → see graph in browser |
| M3: Full MVP | 2.2–2.4 | All 7 must-have features working |
| M4: Production-ready | 2.5–2.6 | Perf budget met, error handling complete |

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PDF parsing fails for complex layouts | Medium | Low | Ship text-paste as primary; PDF as progressive enhancement |
| NLP concept extraction quality is low | Medium | High | Use AxiomaticrulesVX.md as test fixture early; tune patterns before sprint 2 |
| ruvector-dag API changes break adapter | Low | Medium | Pin workspace dependency version; adapter is thin |
| Cytoscape.js perf >500 nodes | Low | Low (MVP cap is 50–100 nodes) | Deferred; use viewport culling in V2 |
| mcp-brain-server build breaks with new AppState fields | Low | Medium | Add as non-breaking `Option<>` extension; existing routes untouched |
| Session memory leak (no TTL) | Medium | Medium | Add tokio background task for 2h TTL eviction at Task 1.7 |

### Definition of Done (MVP)

- All 7 must-have features pass their acceptance criteria from MVP_SCOPE.md
- `cargo build` and `cargo test` pass without warnings
- 5 MB document processes end-to-end in <5s
- A non-technical user can complete the full 5-step workflow in under 5 minutes
- Every concept and relation in the exported report is traceable to a source sentence
- No new compile warnings or errors in existing mcp-brain-server routes

---

## Reuse Map

| Existing Asset | Location | Used For |
|---|---|---|
| `GroundedProposition` | `crates/mcp-brain-server/src/symbolic.rs` | Attestation proof format; future brain-memory compatibility |
| `KnowledgeGraph` + mincut integration | `crates/mcp-brain-server/src/graph.rs` | Reference implementation for consistency zone partitioning |
| `QueryDag` + traversal iterators | `crates/ruvector-dag/src/dag/` | Concept graph structure; depth computation |
| `DynamicMinCut` | `crates/ruvector-mincut/` | Consistency zone partitioning (System A Rule 7) |
| `ForwardPushSolver` | `crates/ruvector-solver/` | PPR-based equivalence class detection (Rule 8 resonance scoring) |
| Axum + AppState wiring | `crates/mcp-brain-server/src/routes.rs` | Route registration pattern; no duplication |
| SvelteKit build config | `ui/ruvocal/` | Tailwind, Vite, TypeScript, PostCSS — copy and adapt |
| SSE stream pattern | `crates/mcp-brain-server/src/routes.rs` | Ingest progress streaming |
| `BrainCategory` enum | `crates/mcp-brain-server/src/types.rs` | Domain tagging on extracted concepts |
