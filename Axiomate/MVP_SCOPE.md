# Axiomate Explorer — MVP Scope Definition

**Version:** 1.0  
**Target Sprint Scope:** 1–2 sprints (2–3 weeks)  
**Frozen:** May 11, 2026  

---

## 1. MVP Goal

**"Enable non-technical users to load knowledge documents, extract and visualize concept relationships, and understand conflicts — in a single, intuitive workflow."**

The MVP demonstrates Axiomate's ability to:
- Parse and structure unstructured knowledge (text, rules, documents)
- Extract concepts and their relationships automatically
- Visualize the resulting knowledge graph
- Flag conflicts and suggest resolutions
- Explain the reasoning with a simple trace

**Success = A business analyst can upload a 5-page domain document and within 2 minutes see the core concepts, relationships, and any inconsistencies.**

---

## 2. Feature Set

### 2.1 MUST-HAVE (Core MVP)

#### **Feature 1: Document Ingest**
- **What:** User uploads a document (text, PDF, or paste raw text into browser)
- **How:** Single upload box; auto-parse; extract raw text
- **Output:** Extracted text stored in session; display parsing status
- **Acceptance:**
  - Upload 1–5 MB file ✓
  - Support `.txt`, `.pdf`, `.md` ✓
  - Display parsed text preview ✓
  - Show parsing errors clearly ✓

#### **Feature 2: Automatic Concept Extraction**
- **What:** Parse document → extract candidate concepts (nouns, noun phrases, key definitions)
- **How:** Simple NLP/regex + keyword extraction; no heavy ML initially
- **Output:** List of ~20–50 concepts with their source sentences
- **Implementation:**
  - Sentence tokenization ✓
  - Named entity recognition (spaCy or similar) ✓
  - Frequency-weighted noun phrase extraction ✓
  - Domain-specific term detection (rules, axioms, definitions) ✓
- **Acceptance:**
  - Extract at least 80% of explicitly defined concepts ✓
  - Surface top 50 by relevance ✓
  - Show source quote for each concept ✓

#### **Feature 3: Automatic Relation Extraction**
- **What:** Infer relationships between concepts from document text
- **How:** Pattern matching (e.g., "A subsumes B", "A conflicts with B", "A requires B") + simple relation classifier
- **Output:** Edge list with relation types: `subsumes | requires | conflicts_with | related_to`
- **Patterns to Flag:**
  - Subsumption: "X is a type of Y", "X is a subclass of Y"
  - Conflict: "X conflicts with Y", "X contradicts Y", "not X but Y"
  - Requirements: "X requires Y", "X depends on Y", "X assumes Y"
  - Equivalence: "X is also known as Y", "X ≡ Y"
- **Acceptance:**
  - Find ≥60% of explicit relation mentions ✓
  - Classify relation type correctly ✓
  - Avoid hallucinated edges (low false-positive rate) ✓

#### **Feature 4: Knowledge Graph Visualization (Interactive)**
- **What:** Interactive node-link diagram showing concepts + relations
- **How:** Force-directed layout (D3.js, Cytoscape, or three.js); click to inspecting nodes
- **Interaction:**
  - Pan, zoom, drag nodes ✓
  - Click a concept → show its definition + source quotes ✓
  - Hover over edge → highlight the sentence that supports it ✓
  - Color code edges by relation type ✓
- **Layout:**
  - Core concepts (high frequency) → center
  - Shallow concepts → top (entry points)
  - Derived concepts → lower levels
- **Acceptance:**
  - Render 50+ nodes/edges in <2s ✓
  - Interaction latency <200ms ✓
  - Mobile-friendly (responsive) ✓

#### **Feature 5: Conflict Detection + Summary**
- **What:** Identify contradictions and flag them prominently
- **How:** Check for:
  - Opposing edges: `A subsumes B` AND `B subsumes A` ✓
  - Explicit contradictions: sentences with "contradicts" or "NOT X" ✓
  - Multi-valued conflicts: concept defined two different ways ✓
- **Output:** List of conflicts with severity (HIGH, MEDIUM, LOW)
- **Display:**
  - Highlight conflicted concepts in graph (red border) ✓
  - Show both conflicting statements side-by-side ✓
  - Suggested resolution (pick one, merge, or defer) ✓
- **Acceptance:**
  - Detect ≥70% of explicit contradictions ✓
  - Present conflicts in < 5ms ✓
  - Allow user to mark resolved conflicts ✓

#### **Feature 6: Reasoning Trace (Explanation)**
- **What:** Show how the system extracted a concept or inferred a relation
- **How:** Return the supporting text + rule applied (e.g., "Extracted 'Stakeholder' because it appears as a defined term in line 12")
- **Output:** Expandable trace for each concept/edge
- **Acceptance:**
  - Every concept shows its source sentence ✓
  - Every edge shows its inference rule + supporting text ✓
  - Trace is readable to non-technical users ✓

#### **Feature 7: Proof/Attestation Summary**
- **What:** Generate a human-readable summary of the knowledge base
- **How:** Enumerate all concepts, top relations, conflict count, and reasoning confidence
- **Output:** Exportable text/JSON report
- **Report Includes:**
  - Total concepts extracted ✓
  - Total relations found ✓
  - Number of conflicts detected ✓
  - Confidence score per concept (0–100%) ✓
  - List of axioms/entry points ✓
  - List of conflicts + resolutions ✓
- **Acceptance:**
  - Report generated in <1s ✓
  - All claims in report are traceable to source ✓
  - Export as JSON + human-readable text ✓

### 2.2 SHOULD-HAVE (Adds ~20% more value, deferred if time-constrained)

#### **Feature 8: Domain-Specific Rules**
- **What:** Let user upload or select a domain-specific rule set (e.g., "software engineering rules") to apply during extraction
- **How:** Simple YAML rule syntax; pre-load SWEBOK/PMBOK rules as templates
- **Output:** Extracted concepts filtered/enriched by rules
- **Example Rule:**
```yaml
domain: software_engineering
patterns:
  - subsumes: ["test", "unit_test", "integration_test"]
  - requires:
      - ["requirement", "design"]
      - ["design", "implementation"]
  - conflicts:
      - ["waterfall", "agile"]
```
- **Acceptance:**
  - User uploads custom rules ✓
  - System applies rules during extraction ✓
  - Accuracy improves by ≥10% ✓

#### **Feature 9: Consistency Zone Highlighting**
- **What:** Visually partition the graph into "safe" (no conflicts) and "review" (potential conflicts) zones
- **How:** Algorithm marks linked components; highlight safe zones in green, conflict zones in orange
- **Output:** Graph re-rendered with zones colored
- **Acceptance:**
  - Safe zones contain 0 conflicts ✓
  - Yellow/orange zones contain flagged conflicts ✓
  - Zone computation <500ms ✓

#### **Feature 10: Equivalence Class Detection**
- **What:** Show when multiple concepts mean the same thing (e.g., "requirement" vs "specification")
- **How:** Similarity scoring + user confirmation
- **Output:** Merge candidates with confidence % ✓
- **Acceptance:**
  - Suggest merges for synonyms ✓
  - Allow user to accept/reject merge ✓
  - Re-render graph after merge ✓

#### **Feature 11: Export Graph**
- **What:** Export the knowledge graph in formats suitable for downstream tools
- **How:** SVG (visual), JSON (data), Cypher (Neo4j), TTL (RDF/semantic web)
- **Acceptance:**
  - Export as SVG for presentations ✓
  - Export as JSON for programmatic use ✓
  - Export as RDF/TTL for semantic web tools ✓

#### **Feature 12: Multi-Document Merge**
- **What:** Upload 2–3 documents simultaneously and merge their knowledge graphs
- **How:** For MVP, simple union of concepts + relations; flag conflicts between documents
- **Output:** Merged graph + list of cross-document conflicts (e.g., conflicting definitions)
- **Acceptance:**
  - Merge ≤5 documents ✓
  - Show which document each concept comes from ✓
  - Flag document-level conflicts (e.g., "Doc A says X subsumes Y; Doc B says Y subsumes X") ✓

### 2.3 EXPLICITLY EXCLUDED (V2+)

- ❌ Machine learning model training or fine-tuning (use pre-trained extractors only)
- ❌ Real-time collaborative editing (single-user, session-based only)
- ❌ Permission/access control (no auth required for MVP)
- ❌ Persistent data storage (in-memory session only; export to download)
- ❌ Advanced reasoning (backward chaining, theorem proving)
- ❌ Fuzzy logic or probabilistic inference
- ❌ Semantic web triple-store backend (use in-memory graph only)
- ❌ Multi-language support (English only for MVP)
- ❌ Mobile app (web-only; responsive design only)
- ❌ API/SDK for programmatic access
- ❌ Batch processing or scheduled jobs
- ❌ Audit logging or versioning

---

## 3. Core User Journey (The "Killer Workflow")

### Step 1: Upload & Parse
```
User opens browser → "Upload Document" button
  ↓ (User uploads SWEBOK pdf)
  ↓ System parses + shows preview ("Extracted 127 sentences...")
  ↓ User clicks "Extract Concepts"
```

### Step 2: Review Concepts
```
System displays list of extracted concepts:
  • Software Development Process (84 mentions)
  • Risk Management (72 mentions)
  • Requirement (65 mentions)
  ...
  
User clicks "Visualize" to see the graph
```

### Step 3: Explore Graph
```
Interactive graph renders in browser
User clicks concept node "Risk Management" → side panel shows:
  • Definition: "..."
  • Source: "Chapter 3, SWEBOK"
  • Relations: "subsumes: Risk Identification, Risk Assessment"
  • Confidence: 92%
```

### Step 4: Review Conflicts
```
System flags: "CONFLICT found: 'Process' subsumes 'Discipline' 
              but also 'Discipline' subsumes 'Process'"
  
Suggested resolution: "Pick one direction or merge into equivalence class"
User clicks "Merge as equivalence" → concepts linked
```

### Step 5: Export
```
System shows summary:
  • ~80 core concepts
  • 120+ relations
  • 3 conflicts (1 resolved)
  
User clicks "Export Report" → JSON file downloaded with full attestation
```

---

## 4. Acceptance Criteria for MVP Completion

### Functional Criteria
- [ ] User can upload 1 document (txt/pdf/md) ≤5 MB
- [ ] System extracts ≥50 concepts with ≥80% accuracy on defined terms
- [ ] System infers ≥60% of "obvious" relations (subsumes, requires, conflicts)
- [ ] Graph visualization renders 50+ nodes/edges in <2s
- [ ] Conflict detection finds all explicit contradictions + 70% of implicit conflicts
- [ ] User can explore any concept → see source + relation trace
- [ ] User can export report (JSON + text) with full traceability
- [ ] All extracted data is traceable to source document

### Performance Criteria
- [ ] Document parse + concept extraction: <5s for 5 MB file
- [ ] Graph render: <2s for 100 nodes
- [ ] Zoom/pan: <200ms latency
- [ ] Conflict detection: <500ms
- [ ] Export: <1s for 100 nodes

### User Experience Criteria
- [ ] A non-technical user can complete workflow in 5 minutes
- [ ] All error messages are clear + actionable
- [ ] Mobile-friendly responsive design (works on tablet)
- [ ] No external auth/login required
- [ ] One-page UI (no complex multi-step wizard)

### Quality Criteria
- [ ] <5% false-positive edges (hallucinated relations)
- [ ] <2% loss of accuracy when exporting/re-importing
- [ ] Unit test coverage ≥70% on extraction logic
- [ ] No data loss during session

---

## 5. Sprint Breakdown

### Sprint 1 (Week 1)

**Goal:** Foundation + core extraction engine

| Task | Owner | Est. Days | Status |
|------|-------|----------|--------|
| Document ingest (upload + parser) | Backend | 1.5 | - |
| Concept extraction pipeline | NLP Lead | 2 | - |
| Relation extraction (pattern matching) | NLP Lead | 2 | - |
| In-memory graph data structure | Backend | 1 | - |
| Conflict detection algorithm | Backend | 1 | - |
| Basic UI shell (React) | Frontend | 1 | - |
| **Total** | | **8.5** | - |

### Sprint 2 (Week 2–3)

**Goal:** Visualization + UX polish + export

| Task | Owner | Est. Days | Status |
|------|-------|----------|--------|
| Interactive graph visualization (D3/Cytoscape) | Frontend | 2.5 | - |
| Node click + side panel (inspect) | Frontend | 1.5 | - |
| Reasoning trace + source highlighting | Backend + Frontend | 1.5 | - |
| Proof/attestation report generator | Backend | 1.5 | - |
| Conflict resolution UI (merge, pick, defer) | Frontend | 1.5 | - |
| Export (JSON + text) | Backend | 1 | - |
| End-to-end testing + perf optimization | QA + Backend | 2 | - |
| **Total** | | **11.5** | - |

**Total MVP Effort:** ~20 days (2 weeks with some parallelization)

---

## 6. Tech Stack (Recommended for MVP)

| Layer | Tech |
|-------|------|
| **Backend** | Node.js + Express (or Python FastAPI) |
| **NLP** | spaCy (entity extraction) + custom regex patterns |
| **Graph** | in-memory NetworkX (Python) or D3-Graph-Data (JS) |
| **Frontend** | React + D3.js for visualization |
| **Storage** | Session-based (in-memory); localStorage as fallback for exports |
| **Deployment** | GitHub Pages (static) + Vercel/Netlify (serverless backend) |

---

## 7. V2 / V3 Roadmap (Deferred Features)

### V1.5 (Post-MVP, 1 sprint)
- Domain-specific rule upload (YAML syntax)
- Consistency zone highlighting
- Equivalence class detection + auto-merge
- Multi-document merge
- Export to Neo4j Cypher + RDF/TTL

### V2 (Sprint after V1, 2–3 sprints)
- User authentication + persistent workspaces
- Collaborative editing (real-time, OT-based)
- Advanced reasoning (backward chaining on relations)
- Semantic similarity scoring (embedding-based)
- Import from Neo4j / knowledge graph APIs
- Batch processing of large document collections
- API/SDK for programmatic access

### V3 (Quarter 2+)
- Multi-language support (Spanish, Mandarin, etc.)
- Probabilistic inference (Bayesian reasoning)
- Fine-tuned extraction models (transfer learning)
- Mobile-native app (React Native / Flutter)
- Audit logging + version control (Git-like branching)
- Custom conflict resolution strategies
- Integration with ontology tools (Protégé, WebOntology)
- ML-powered suggestions for concept merging/renaming

---

## 8. Success Metrics (Post-Launch)

### Day 1–7 (Internal Testing)
- [ ] Load 5 real-world documents; verify extraction accuracy ≥80%
- [ ] Non-technical user completes workflow without docs
- [ ] All relation types correctly identified in 80% of test cases
- [ ] Conflict resolution suggestions are useful in 90% of cases

### Week 1–4 (Beta Users)
- [ ] 10 beta users test; NPS ≥50
- [ ] Average session time: 8–15 minutes
- [ ] User retention (day 3): ≥60%
- [ ] Most valuable feature: (track via telemetry)
- [ ] Top 3 feature requests for V2

### Long-term (Product Health)
- [ ] Extraction accuracy improves with domain-specific rules (+15%)
- [ ] Users successfully merge 2+ documents without errors
- [ ] Export report used in 40%+ of sessions
- [ ] Conflict resolution rate: 85%+ of flagged conflicts resolved

---

## 9. Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Concept extraction accuracy <70% | Medium | High | Use pre-trained NER; add domain rule tuning in V1.5 |
| Graph rendering slow (100+ nodes) | Low | Medium | Use virtualization; WebGL backend if needed |
| False-positive conflicts | Medium | High | Require human confirmation before flagging; show confidence % |
| User loses data on session timeout | Medium | High | Auto-save to localStorage; warn before clearing |
| PDF parsing fails on complex layouts | Medium | Low | Display raw text preview; let user copy-paste instead |
| No clear "entry points" for non-experts | Medium | Medium | Provide tutorial + example documents |

---

## 10. Appendix: Example Workflow Output

### Input Document Snippet
```
"Risk management is the process of identifying, analyzing, and responding 
to risks. Risk identification is a core part of planning. Risk assessment 
involves evaluating the probability and impact of each risk. Risk assessment 
does NOT include response planning (that is risk response). However, risk 
assessment informs risk response..."
```

### Expected Output: Concepts
```json
{
  "concepts": [
    { "id": 1, "text": "Risk Management", "frequency": 8, "type": "axiom", "confidence": 0.98 },
    { "id": 2, "text": "Risk Identification", "frequency": 5, "type": "derived", "confidence": 0.95 },
    { "id": 3, "text": "Risk Assessment", "frequency": 5, "type": "derived", "confidence": 0.95 },
    { "id": 4, "text": "Risk Response", "frequency": 4, "type": "derived", "confidence": 0.92 },
    { "id": 5, "text": "Planning", "frequency": 2, "type": "related", "confidence": 0.85 }
  ]
}
```

### Expected Output: Relations
```json
{
  "relations": [
    { "from": 1, "to": 2, "type": "subsumes", "source": "Risk management is the process...", "confidence": 0.96 },
    { "from": 1, "to": 3, "type": "subsumes", "source": "Risk management is the process...", "confidence": 0.96 },
    { "from": 1, "to": 4, "type": "subsumes", "source": "...", "confidence": 0.90 },
    { "from": 2, "to": 5, "type": "requires", "source": "Risk identification is a core part of planning", "confidence": 0.88 },
    { "from": 3, "to": 4, "type": "conflicts_with", "source": "...does NOT include response planning", "confidence": 0.94 }
  ]
}
```

### Expected Output: Conflicts
```json
{
  "conflicts": [
    {
      "type": "exclusion",
      "severity": "HIGH",
      "statement_a": "Risk Assessment involves evaluating probability and impact",
      "statement_b": "Risk Assessment does NOT include response planning",
      "resolution_options": [
        "Accept both (no conflict — they refer to different scopes)",
        "Clarify scope: add qualifier 'Risk Assessment (Planning Phase)' vs 'Risk Assessment (Response Phase)'"
      ]
    }
  ]
}
```

---

## Summary

**Axiomate Explorer MVP in One Sentence:**
*A browser-based tool that lets users upload a document, automatically extract its core concepts and relationships, visualize the resulting knowledge graph, identify conflicts, and export a traceable report — all in under 5 minutes, with zero technical setup.*

**Key Differentiator:** Automatic extraction + conflict detection + reasoning transparency (user sees *why* the system extracted what it extracted)

**Time to Market:** 2–3 weeks (2 sprints)  
**Team Size:** 3–4 (1 backend, 1 NLP, 1 frontend, 1 QA/PM)  
**Go/No-Go Gate:** Day 10 — if extraction accuracy is <75% on test docs, pivot to rule-based approach or defer ML to V1.5
