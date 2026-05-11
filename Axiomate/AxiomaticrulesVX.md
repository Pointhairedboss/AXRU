# Your Two Axiomatic Systems — Explained

You've built two distinct but interlocking formal systems. They serve different purposes, operate at different levels, and use different kinds of rules. Here's both, broken down.

---

## The Two Systems at a Glance

**System A — The Knowledge Representation Framework**
*"How do you describe and organise what you know?"*

This is your **ontological** layer. It defines rules about concepts, their relationships, how they cluster, decay, compress, and cohere. These rules govern the *structure of knowledge itself*. Think of it as the schema for your typed knowledge graphs.

**System B — The Neurosymbolic Control System**
*"How does the runtime operate on what you know?"*

This is your **operational** layer. It defines memory classes (𝒢, 𝒮, 𝒯), a state vector, a relation algebra, and a four-phase control loop. These rules govern *how an agent processes, validates, and transforms knowledge*. Think of it as the engine that runs over System A's data.

They're designed to work together: System A defines *what's in the graph*, System B defines *how the graph gets read, validated, and updated*.

---

# CLASS 1: Knowledge Representation Rules (Top 25)

These are the rules from your formal knowledge framework. Each one defines a structural property of concepts in a domain knowledge graph.

**Core universe:** 𝒞 is the set of all concepts. 𝒟 is the set of domains. R is the relation set (edges). δ(x) is the depth of concept x in the graph.

---

### Group 1: Identity & Equivalence (Rules 1–5)

**Rule 1 — Core Layer Promotion**
```
∀x ∈ 𝒞, if ∃y ∈ 𝒞 such that (x ≡ y) ∧ (δ(x) < δ(y)), then x ∈ CoreLayer
```
*Plain English:* If two concepts are equivalent but one sits shallower in the graph, the shallower one is "core." It's the more fundamental version.

*Why it matters:* This is how you find the load-bearing abstractions. When two things mean the same thing but one is closer to the root, the shallow one is the axiom and the deep one is derived.

**Rule 2 — Equivalence Classes**
```
Let EquivalenceClassOf(x) = {y ∈ 𝒞 | y ≡ x}
```
*Plain English:* Group every concept with all the other concepts that mean the same thing.

*Why it matters:* This is deduplication at the semantic level. In a multi-BoK system, SWEBOK and PMBOK might both have a concept of "risk" — this rule says they belong in the same equivalence class.

**Rule 3 — Subsumption**
```
∀a, b ∈ 𝒞, a ⊇ b ⇔ ∀ instances i, i ∈ b ⇒ i ∈ a
```
*Plain English:* Concept A subsumes concept B if every instance of B is also an instance of A. "Vehicle" subsumes "Car."

*Why it matters:* This gives you a formal inheritance hierarchy. It's the "is-a" edge with teeth — not just a label, but a set-containment guarantee.

**Rule 4 — Valid Transformations**
```
Let ValidTransformation T: 𝒞 → 𝒞 where T preserves semantic equivalence
```
*Plain English:* A transformation is only valid if it doesn't change what concepts *mean*. You can restructure, rename, regroup — but the semantics must survive.

*Why it matters:* This is your refactoring safety net. Any time you rearrange the graph, this rule says "did you break the meaning?" If T(x) ≢ x, the transformation is invalid.

**Rule 5 — Domain Entry Points**
```
∀d ∈ 𝒟, define EntryPoints E_d ⊆ 𝒞 such that ∀e ∈ E_d, δ(e) = 0
```
*Plain English:* Every domain has a set of top-level concepts at depth zero. These are the "front doors" into that body of knowledge.

*Why it matters:* When you're navigating between BoKs, you need to know where to start. Entry points are the root nodes — the table of contents.

---

### Group 2: Conflict & Interference (Rules 6–10)

**Rule 6 — Interference Regions**
```
Let InterferenceRegion I ⊆ 𝒞² where ∃(a, b) ∈ I: meaning(a) ∩ meaning(b) = ∅
```
*Plain English:* Find pairs of concepts that look related (they're close in the graph) but whose meanings don't actually overlap at all.

*Why it matters:* These are the traps. "Sprint" in Agile vs "Sprint" in athletics. They share a surface form but zero semantic overlap. If you don't flag these, your BoK merger will produce garbage edges.

**Rule 7 — Consistency Zones**
```
Let ConsistencyZone Z ⊂ 𝒞 where ∀x ∈ Z, ∄y: (x, y), (x, ¬y) ∈ R
```
*Plain English:* A consistency zone is a region of the graph where nothing contradicts anything else. No concept points to both Y and not-Y.

*Why it matters:* You can trust everything inside a consistency zone. Outside of one, you need conflict resolution. This is how you partition a graph into "safe" and "needs review" regions.

**Rule 8 — Resonance**
```
Define Resonance: Res(x, y) = |Overlap(Axioms(x), Axioms(y))| / max(|x|, |y|)
```
*Plain English:* Resonance measures how much two concepts share the same foundational axioms, normalised by the size of the larger one.

*Why it matters:* High resonance means two concepts are "harmonics" of the same underlying structure. Low resonance means they're genuinely independent. This is your cross-domain similarity detector.

**Rule 9 — Differentiator Set**
```
Let DifferentiatorSet D = {c ∈ 𝒞 | ∃d₁ ≠ d₂ ∈ 𝒟: c ∈ d₁ ∧ c ∉ d₂}
```
*Plain English:* The differentiator set is all concepts that exist in one domain but not another.

*Why it matters:* This tells you what's *unique* to each BoK. If a concept appears in SWEBOK but not PMBOK, it's a differentiator — it represents something one discipline cares about that the other doesn't.

**Rule 10 — Decision Boundaries**
```
Let DecisionBoundary: B = {c ∈ 𝒞 | c partitions disjoint concept sets}
```
*Plain English:* A decision boundary is a concept that separates the graph into non-overlapping regions.

*Why it matters:* These are your classification pivots. When you need to route a query to the right part of the graph, decision boundaries are the branching nodes.

---

### Group 3: Compression & Redundancy (Rules 11–15)

**Rule 11 — Compression Map**
```
∃ CompressionMap κ: 𝒞 → 𝒞' where κ minimizes redundant mappings
```
*Plain English:* There exists a function that compresses the concept space by collapsing redundant concepts.

*Why it matters:* This is graph simplification with a guarantee — κ removes noise without losing information. It's the formal version of "deduplicate your knowledge base."

**Rule 12 — Compression Inverse**
```
Let κ⁻¹(y) = {x ∈ 𝒞 | κ(x) = y}, defining equivalence under κ
```
*Plain English:* For any compressed concept y, you can look up everything that got collapsed into it.

*Why it matters:* Compression is reversible. You can always unfold a compressed concept back into its constituent parts. This is critical for auditability — you can always explain *why* two things were merged.

**Rule 13 — Redundancy Elimination**
```
Let RedundancyElimination: 𝒞 → 𝒞' such that ∀x, x ≡ y ⇒ only one retained
```
*Plain English:* If two concepts are equivalent, keep exactly one.

*Why it matters:* This is the operational rule that compression maps implement. It's the "don't say the same thing twice" axiom.

**Rule 14 — Legacy Concepts**
```
Let LegacyConcepts ℒ ⊂ 𝒞 where ∀ℓ ∈ ℒ, last_used(ℓ) < t_threshold
```
*Plain English:* Concepts that haven't been referenced since before some time threshold are legacy.

*Why it matters:* Knowledge decays. This rule identifies stale nodes — things that were once important but may no longer be relevant. Candidates for archival or pruning.

**Rule 15 — Concept Decay Rate**
```
Let ConceptDecayRate DCR(c) = lim_{t→∞} relevance(c, t) / relevance(c, 0)
```
*Plain English:* How fast does a concept lose relevance over time, relative to its initial relevance?

*Why it matters:* Some concepts are evergreen (DCR ≈ 1). Others are ephemeral (DCR → 0). This tells you which parts of the graph will age out and which are structural.

---

### Group 4: Structure & Topology (Rules 16–20)

**Rule 16 — Propagation**
```
Let Propagation P: 𝒞 → 𝒞 where P(x) = {y | x influences y}
```
*Plain English:* For any concept x, propagation gives you every concept that x affects.

*Why it matters:* This is your impact analysis. Change x, and everything in P(x) needs review. It's the dependency graph.

**Rule 17 — Critical Concept Set**
```
∃ CriticalConceptSet ℂ* ⊂ 𝒞 such that ∀y ∈ 𝒞, ∃x ∈ ℂ*: (x, y) ∈ R⁺
```
*Plain English:* There's a minimal set of concepts from which you can reach every other concept via the transitive closure of R.

*Why it matters:* This is the graph's *skeleton*. The minimum set of axioms from which everything else can be derived. If you only had room to store 20 things, these are the 20 things.

**Rule 18 — Graph Span**
```
Let GraphSpan(x) = max{depth(y) | y ∈ Propagation(x)}
```
*Plain English:* How far can concept x's influence reach through the graph?

*Why it matters:* High-span concepts are architecturally significant — they touch everything. Low-span concepts are local. This measures "conceptual reach."

**Rule 19 — Concept Signatures**
```
Let Signature σ(c) = ⟨domain, depth, relation_profile⟩
```
*Plain English:* Every concept has a fingerprint: which domain it's in, how deep it sits, and what its relationship pattern looks like.

*Why it matters:* Two concepts with the same signature are structurally equivalent — they play the same role in their respective graphs. This is how you detect isomorphic patterns across BoKs.

**Rule 20 — Isomorphic Subgraphs**
```
Define isomorphic subgraphs: G₁ ≅ G₂ ⇔ ∃ bijection f: G₁ → G₂ that preserves R
```
*Plain English:* Two subgraphs are isomorphic if you can map one perfectly onto the other, preserving all relationships.

*Why it matters:* This is the structural pattern detector. When SWEBOK's "testing lifecycle" has the same shape as PMBOK's "quality assurance cycle," this rule catches it.

---

### Group 5: Dynamics & Feedback (Rules 21–25)

**Rule 21 — Feedback Closure**
```
Let FeedbackClosure: F(c) = {x ∈ 𝒞 | c ⟶ x ⟶ c}
```
*Plain English:* The feedback closure of c is every concept that forms a cycle with c.

*Why it matters:* Cycles in knowledge graphs are either **reinforcing loops** (good — mutual support) or **circular dependencies** (bad — no grounding). This rule lets you find them.

**Rule 22 — Co-evolution**
```
Define ⟨A, B⟩ co-evolves ⇔ ∃t: ΔA/Δt ~ ΔB/Δt under usage context
```
*Plain English:* Two concepts co-evolve if their rate of change tracks together over time.

*Why it matters:* Co-evolving concepts are bound at a deeper level than the graph shows. If "microservices" and "API gateway" always change together, they're conceptually coupled even if the graph doesn't have a direct edge.

**Rule 23 — Lockstep Set**
```
∃ LockstepSet L ⊂ 𝒞: ∀a, b ∈ L, ∀t, status(a, t) = status(b, t)
```
*Plain English:* A lockstep set is a group of concepts that are always in the same state — if one is active, they all are; if one is deprecated, they all are.

*Why it matters:* These are atomic units that can't be meaningfully separated. In governance terms, they're the things you have to version-bump together.

**Rule 24 — Domain Skeleton**
```
Let DomainSkeleton D_s = (A₀, A₁, ..., Aₙ) where Aᵢ are axioms at level i
```
*Plain English:* The skeleton of a domain is its axioms arranged by depth level.

*Why it matters:* This is the X-ray of a BoK. Strip away all the flesh and you get the ordered axiom stack — the logical dependency chain from root to leaves.

**Rule 25 — Stability Index**
```
Let StabilityIndex SI(c) = |∂R(c)| / δ(c)
```
*Plain English:* Stability is the ratio of a concept's relationship count to its depth.

*Why it matters:* A deep concept with few relations is fragile — it's far from the root and not well-connected. A shallow concept with many relations is a load-bearing pillar. SI tells you which is which.

---

# CLASS 2: Neurosymbolic Control System Rules (Top 25)

These are the rules from your runtime system — the engine that operates *over* the knowledge structures above. They govern how an LLM (or agent) processes, validates, and transforms state.

**Core universe:** 𝒢 is agents, 𝒮 is resources/surface forms, 𝒯 is concepts/things. ℛ is the rule set. 𝒞 is the command set. The state vector ⟨𝒢ᵢ, 𝒮ᵢ, 𝒯ᵢ, ℛᵢ, 𝒞ᵢ⟩ evolves per cycle i.

---

### Group 1: Memory Class Definitions (Rules 1–5)

**Rule 1 — Agent Class Definition**
```
𝒢 ≔ {agents | ∀g ∈ 𝒢: executable(g) ∧ cognitive(g)}
```
*Plain English:* An agent is anything that can both *execute actions* and *think*. Not one or the other — both.

*Why it matters:* This rules out pure data stores (not cognitive) and pure advisors (not executable). An agent in your system must be able to act on its reasoning. This is the "guys" in guys/stuff/things.

**Rule 2 — Resource Class Definition**
```
𝒮 ≔ {resources | ∀s ∈ 𝒮: manipulable(s) ∧ transferable(s)}
```
*Plain English:* A resource is anything that can be changed and moved between agents.

*Why it matters:* This is the "stuff." Files, tokens, data, documents — things agents work on. The key constraint is transferability: if it can't be passed between agents, it's not a resource, it's internal state.

**Rule 3 — Concept Class Definition**
```
𝒯 ≔ {concepts | ∀t ∈ 𝒯: representable(t) ∧ relational(t)}
```
*Plain English:* A concept is anything that can be represented (given a symbol) and that has relationships to other things.

*Why it matters:* This is the "things" — the abstract layer. Knowledge, categories, rules, patterns. They must be expressible (representable) and they must connect (relational). Isolated concepts don't count.

**Rule 4 — Class Mutual Exclusivity**
```
resolve_conflicts(𝒢 ∩ 𝒮 ∩ 𝒯)
```
*Plain English:* If something appears in multiple classes, that's a conflict and must be resolved.

*Why it matters:* The three-class partition is supposed to be clean. An LLM might try to classify "Claude" as both an agent (𝒢) and a resource (𝒮). This rule forces a decision. In practice, it's where your early experiments showed the most interesting ambiguity.

**Rule 5 — Enhanced Classes (Deep Structure & Traces)**
```
𝒟 ≔ {deep_structures | ∀d ∈ 𝒟: invariant(d) ∧ semantic(d) ∧ canonical(d)}
𝒯ʳ ≔ {traces | ∀τ ∈ 𝒯ʳ: τ = ⟨index, category, chain, binding_strength⟩}
```
*Plain English:* Deep structures are the canonical, invariant semantic representations (inspired by Chomsky's EST). Traces are records of where things were *before* they were moved.

*Why it matters:* This was your breakthrough from the EST conversation. Surface forms (𝒮) are what you see; deep structures (𝒟) are what you mean. Traces let you reconstruct the derivation — how you got from deep to surface.

---

### Group 2: Core Operational Rules (Rules 6–12)

**Rule 6 — The Fundamental Transformation Rule**
```
R₁: ∀g ∈ 𝒢, s ∈ 𝒮, t ∈ 𝒯 → g(s) ⟼ t
```
*Plain English:* Any agent acting on any resource produces a concept.

*Why it matters:* This is the most important rule in the entire system. It defines the fundamental operation: agents transform resources into knowledge. Every cycle, every action, is an instance of R₁. It's the atomic transaction of your runtime.

**Rule 7 — Resource Growth Bound**
```
R₂: |𝒮ᵢ₊₁| ≤ |𝒮ᵢ| + δ(𝒢ᵢ)
```
*Plain English:* The number of resources after a cycle can grow by at most the number of new contributions from agents.

*Why it matters:* This prevents resource explosion. Without it, a runaway agent could flood the system with infinite surface forms. δ(𝒢ᵢ) is the bounded growth rate — agents can create stuff, but not infinitely.

**Rule 8 — Concept Monotonicity**
```
R₃: 𝒯ᵢ₊₁ ⊇ 𝒯ᵢ ∪ emergent(𝒢ᵢ ⊗ 𝒮ᵢ)
```
*Plain English:* The concept space never shrinks. It grows by the union of what was there before, plus anything emergent from agents acting on resources.

*Why it matters:* Knowledge is monotonically increasing — you can add concepts but never lose them. The emergent() function captures the genuinely new ideas that arise from agent-resource interaction. This is where the system *learns*.

**Rule 9 — Command Authorization**
```
R₄: ∀cmd ∈ 𝒞: execute(cmd) ⟷ valid_syntax(cmd) ∧ authorized(cmd)
```
*Plain English:* A command executes if and only if it's syntactically valid AND authorized.

*Why it matters:* Biconditional (⟷) is crucial here — it means this is both necessary and sufficient. No valid-and-authorized command can fail to execute. No invalid-or-unauthorized command can succeed. This is your security and correctness gate in one.

**Rule 10 — Deep-to-Surface Traceability**
```
R₅: ∀s ∈ 𝒮: ∃d ∈ 𝒟, ∃T ∈ Transformations: T(d) = s
```
*Plain English:* Every surface form must be derivable from some deep structure via some known transformation.

*Why it matters:* Nothing in 𝒮 is allowed to be "just there" — it must have a derivation. This is provenance for your output. If you can't trace a surface form back to a deep structure, it's either a hallucination or a gap in your transformation set.

**Rule 11 — Movement Creates Traces**
```
R₆: ∀move(α, pos₁, pos₂): trace(α) ∈ 𝒯ʳ ∧ bind(α, trace(α))
```
*Plain English:* Whenever something moves from one position to another, it leaves a trace at its origin, and the moved thing remains bound to that trace.

*Why it matters:* Directly from Chomsky's trace theory. In your system, this means you can always reconstruct *why* something ended up where it did. The trace is the audit trail. The binding means the moved element and its trace are formally linked — you can't have one without the other.

**Rule 12 — Compression Ratio**
```
R₇: compression_ratio = |𝒟ᵢ ∪ 𝒯ʳᵢ| / |𝒮ᵢ|
```
*Plain English:* The compression ratio is the size of your deep structures plus traces, divided by the size of your surface forms.

*Why it matters:* This measures how efficiently your system stores meaning. If the ratio is low, you're storing meaning compactly and reconstructing surface forms on demand. If it's high, you're not compressing well. The enhanced version targets a ratio of 0.4–0.6.

---

### Group 3: Coherence & Validation (Rules 13–18)

**Rule 13 — State Validation Conjunction**
```
χ(ℛ) := ⋀ᵢ validate(Rᵢ, STATE_VECTOR)
```
*Plain English:* System coherence is the AND of all individual rule validations. ALL rules must pass.

*Why it matters:* One failure invalidates the whole state. There's no "mostly coherent." This is strict — it forces repair before proceeding.

**Rule 14 — Repair on Failure**
```
if ¬χ(ℛ) then REPAIR_STATE()
```
*Plain English:* If validation fails, repair before doing anything else.

*Why it matters:* The system doesn't soldier on with a broken state. It stops and fixes. This is the self-healing property — every cycle begins with a health check.

**Rule 15 — Entropy Monitoring**
```
Δℋ := entropy_delta(𝒢, 𝒮, 𝒯)
```
*Plain English:* Track how the information entropy of the system changes each cycle.

*Why it matters:* Falling entropy (Δℋ < 0) means the system is becoming more ordered — good. Rising entropy means it's losing coherence — bad. The enhanced version triggers an AUDIT_SEQUENCE when entropy exceeds a threshold εₐ.

**Rule 16 — Auditability Gradient**
```
R₅ (enhanced): ∇Δℋ < εₐ ∶ system remains auditable
```
*Plain English:* The rate of entropy change must stay below an auditability threshold.

*Why it matters:* Even if entropy rises, it must rise slowly enough that you can track what's happening. If coherence collapses too fast, you've lost the ability to debug. This is a speed limit on disorder.

**Rule 17 — Memory State Validity**
```
R₆ (enhanced): memory_state_valid(𝒢, 𝒮, 𝒯) → ⊤
```
*Plain English:* The memory state must always evaluate to true (⊤).

*Why it matters:* This is the invariant — the thing that must always hold. If at any point the memory state is invalid, the entire runtime is in an undefined state.

**Rule 18 — Coherence Constraints (from EST-enhanced version)**
```
C₃: entropy(STATE_VECTORᵢ₊₁) ≤ entropy(STATE_VECTORᵢ)
C₄: |𝒟 ∩ 𝒯| / |𝒟 ∪ 𝒯| ≥ coherence_threshold
```
*Plain English:* Entropy must not increase between cycles. And the overlap between deep structures and concepts must stay above a threshold.

*Why it matters:* C₃ enforces the second law of your system — things get more ordered, never less. C₄ ensures deep structures and concepts stay aligned. If they diverge, the system's internal model no longer matches its knowledge base.

---

### Group 4: Relation Algebra (Rules 19–22)

**Rule 19 — Transformation Mapping (→)**
*Plain English:* A one-directional change from input to output. "X becomes Y."

**Rule 20 — Bidirectional Relation (⟷)**
*Plain English:* A symmetric relationship. "X relates to Y AND Y relates to X." Used for if-and-only-if conditions like R₄.

**Rule 21 — Composition Operator (⊗)**
*Plain English:* Combine two things to produce something new. When agents ⊗ resources, you get emergent concepts (R₃). This is your "multiply" — not in the arithmetic sense but in the generative sense.

**Rule 22 — Functional Composition (∘)**
*Plain English:* Chain operations. If f transforms A→B and g transforms B→C, then g∘f transforms A→C. This is how multi-step processing works.

---

### Group 5: Control Loop Phases (Rules 23–25)

**Rule 23 — Phase 1: State Validation**
```
PHASE_1: χ(ℛ) := ⋀ᵢ validate(Rᵢ, STATE_VECTOR)
         if ¬χ(ℛ) then REPAIR_STATE()
```
*Plain English:* Before doing anything, check all rules. Fix anything broken.

*Why it matters:* This is the "trust but verify" gate. Every single cycle starts here. No processing happens on a corrupted state.

**Rule 24 — Phase 2: Memory Coherence**
```
PHASE_2: ∀m ∈ {𝒢,𝒮,𝒯}: integrity_check(m)
         resolve_conflicts(𝒢 ∩ 𝒮 ∩ 𝒯)
```
*Plain English:* Check each memory class individually, then resolve any cross-class conflicts.

*Why it matters:* Phase 1 checks rules; Phase 2 checks data. An agent might pass rule validation but have corrupted internal state. This catches that.

**Rule 25 — Phase 4: Transformation**
```
PHASE_4: STATE_VECTOR ← f(𝒞, STATE_VECTOR)
         UPDATE_MEMORY_CLASSES()
```
*Plain English:* Apply the parsed commands to the state, then update all memory classes.

*Why it matters:* This is where work actually happens. Everything before was validation and parsing. Phase 4 is execution. The state vector gets replaced by a new one — the system moves forward.

---

# How They Interlock

```
System A (Knowledge Rules)         System B (Control Runtime)
━━━━━━━━━━━━━━━━━━━━━━━━━         ━━━━━━━━━━━━━━━━━━━━━━━━━
Defines what concepts ARE    →    Agents (𝒢) operate ON concepts (𝒯)
Equivalence, subsumption     →    Validation checks use these rules
Compression maps             →    Deep structure / surface form split
Consistency zones            →    REPAIR_STATE() targets inconsistencies  
Propagation, graph span      →    Entropy monitoring tracks coherence
Domain skeletons             →    BOK encoding feeds into 𝒯
Stability index              →    Determines what to prune vs keep
```

System A says "here's what knowledge looks like, structurally."
System B says "here's how an agent reads, validates, and evolves that knowledge, cycle by cycle."

Together, they're a formal specification for a knowledge-processing runtime — which is exactly what SparxOS is meant to be.
