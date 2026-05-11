import "./styles.css";
import type {
  AttestationBundle,
  GraphSnapshot,
  Trace,
  ValidationReport,
} from "./contracts/generated-types";

const API_BASE = (globalThis as { AXIOMATE_API_BASE?: string }).AXIOMATE_API_BASE ?? "http://localhost:8787/api/v1";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing app root");
}

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <h1>Axiomate Explorer</h1>
      <p>Day-1 vertical slice: upload text, extract graph, and inspect concept/relation output.</p>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Document Input</h2>
        <textarea id="docText">Risk Management requires Planning. Agile conflicts with Waterfall.</textarea>
        <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem;">
          <button id="runBtn">Run Extract</button>
          <button id="clearBtn" class="secondary">Clear Output</button>
        </div>
        <p id="status"></p>
      </div>

      <div class="panel">
        <h2>Graph Snapshot</h2>
        <div id="summary"></div>
        <div id="concepts"></div>
        <div id="relations"></div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Validation</h2>
        <div id="validation"></div>
      </div>
      <div class="panel">
        <h2>Attestation</h2>
        <div id="attestation"></div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Trace Sample</h2>
        <div id="traces"></div>
      </div>
      <div class="panel">
        <h2>Export Preview</h2>
        <pre id="exported">No export yet.</pre>
      </div>
    </section>

    <section class="panel" style="margin-top: 1rem;">
      <h2>Raw Response</h2>
      <pre id="raw">No run yet.</pre>
    </section>
  </main>
`;

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const raw = document.querySelector<HTMLPreElement>("#raw")!;
const conceptsEl = document.querySelector<HTMLDivElement>("#concepts")!;
const relationsEl = document.querySelector<HTMLDivElement>("#relations")!;
const summaryEl = document.querySelector<HTMLDivElement>("#summary")!;
const docText = document.querySelector<HTMLTextAreaElement>("#docText")!;
const validationEl = document.querySelector<HTMLDivElement>("#validation")!;
const attestationEl = document.querySelector<HTMLDivElement>("#attestation")!;
const tracesEl = document.querySelector<HTMLDivElement>("#traces")!;
const exportedEl = document.querySelector<HTMLPreElement>("#exported")!;
let currentSessionId = "";
let currentValidation: ValidationReport | null = null;

async function runFlow(): Promise<void> {
  status.textContent = "Creating session...";

  const sessionRes = await fetch(`${API_BASE}/sessions`, { method: "POST" });
  if (!sessionRes.ok) {
    status.textContent = "Failed creating session.";
    return;
  }

  const session = await sessionRes.json() as { sessionId: string };
  currentSessionId = session.sessionId;
  const contentBase64 = btoa(unescape(encodeURIComponent(docText.value)));

  status.textContent = "Uploading document...";
  const uploadRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "pasted.md",
      mediaType: "text/markdown",
      contentBase64,
    }),
  });

  if (!uploadRes.ok) {
    status.textContent = "Upload failed.";
    return;
  }

  status.textContent = "Running extraction...";
  await fetch(`${API_BASE}/sessions/${session.sessionId}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxConcepts: 50 }),
  });

  const graphRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/graph`);
  if (!graphRes.ok) {
    status.textContent = "Graph fetch failed.";
    return;
  }

  const graph = await graphRes.json() as GraphSnapshot;

  const validationRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });
  const validation = await validationRes.json() as ValidationReport;
  currentValidation = validation;

  const tracesRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/traces`);
  const tracesPayload = await tracesRes.json() as { traces: Trace[] };

  const attestRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/attest`, {
    method: "POST",
  });
  const attestation = await attestRes.json() as AttestationBundle;

  const exportRes = await fetch(`${API_BASE}/sessions/${session.sessionId}/export?format=txt`);
  const exported = await exportRes.json() as { artifact: string };

  renderGraph(graph);
  renderValidation(validation);
  renderTraces(tracesPayload.traces);
  renderAttestation(attestation);
  exportedEl.textContent = exported.artifact;
  raw.textContent = JSON.stringify({ graph, validation, attestation }, null, 2);
  status.textContent = "Done.";
}

function renderGraph(graph: GraphSnapshot): void {
  summaryEl.innerHTML = `<p><strong>${graph.concepts.length}</strong> concepts, <strong>${graph.relations.length}</strong> relations</p>`;

  conceptsEl.innerHTML = `<h3>Concepts</h3>${graph.concepts
    .slice(0, 20)
    .map((c) => `<div class="node">${c.label} <small>(${Math.round(c.confidence * 100)}%)</small></div>`)
    .join("")}`;

  relationsEl.innerHTML = `<h3>Relations</h3>${graph.relations
    .slice(0, 20)
    .map((r) => `<div class="node">${r.fromConceptId} <strong>${r.type}</strong> ${r.toConceptId}</div>`)
    .join("")}`;

  if (graph.relations.length === 0) {
    relationsEl.innerHTML += `<p class="warn">No explicit relations inferred from current text.</p>`;
  }
}

function renderValidation(validation: ValidationReport): void {
  currentValidation = validation;
  validationEl.innerHTML = `
    <p><strong>Status:</strong> ${validation.overallStatus}</p>
    <p><strong>Conflicts:</strong> ${validation.conflicts.length}</p>
    ${validation.conflicts.length > 0 ? '<button id="repairBtn" class="secondary">Repair First Conflict</button>' : ""}
    ${validation.conflicts.length > 0
      ? validation.conflicts
          .map(
            (conflict) =>
              `<div class="node"><strong>${conflict.code}</strong> <span class="capsule ${conflict.severity}">${conflict.severity}</span><br>${conflict.message}</div>`
          )
          .join("")
      : "<p>No conflicts detected.</p>"}
  `;

  const repairBtn = document.querySelector<HTMLButtonElement>("#repairBtn");
  if (repairBtn) {
    repairBtn.addEventListener("click", () => {
      repairFirstConflict().catch((err: unknown) => {
        status.textContent = `Repair failed: ${String(err)}`;
      });
    });
  }
}

async function repairFirstConflict(): Promise<void> {
  if (!currentSessionId || !currentValidation || currentValidation.conflicts.length === 0) {
    status.textContent = "No conflict available for repair.";
    return;
  }

  const firstConflict = currentValidation.conflicts[0];
  status.textContent = `Applying repair for ${firstConflict.code}...`;

  const repairRes = await fetch(`${API_BASE}/sessions/${currentSessionId}/repairs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": `repair-${firstConflict.conflictId}`,
    },
    body: JSON.stringify({
      conflictId: firstConflict.conflictId,
      actionType: firstConflict.code === "RECIPROCAL_SUBSUMPTION" ? "reverse_edge" : "quarantine_relation",
    }),
  });

  if (!repairRes.ok) {
    status.textContent = "Repair request failed.";
    return;
  }

  const validateRes = await fetch(`${API_BASE}/sessions/${currentSessionId}/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "axiomate-mvp-v1", strictMode: true }),
  });
  const validation = await validateRes.json() as ValidationReport;

  const graphRes = await fetch(`${API_BASE}/sessions/${currentSessionId}/graph`);
  const graph = await graphRes.json() as GraphSnapshot;

  renderGraph(graph);
  renderValidation(validation);
  raw.textContent = JSON.stringify({ graph, validation }, null, 2);
  status.textContent = validation.conflicts.length === 0 ? "Repair completed." : "Repair applied; conflicts remain.";
}

function renderTraces(traces: Trace[]): void {
  tracesEl.innerHTML = traces
    .slice(0, 6)
    .map(
      (trace) => `
        <div class="node">
          <strong>${trace.entityType}</strong> ${trace.entityId}
          ${trace.steps
            .map(
              (step) =>
                `<div class="subnode">${step.index}. ${step.operation} via ${step.ruleId} (${Math.round(step.confidence * 100)}%)</div>`
            )
            .join("")}
        </div>
      `
    )
    .join("");
}

function renderAttestation(attestation: AttestationBundle): void {
  attestationEl.innerHTML = `
    <p><strong>ID:</strong> ${attestation.attestationId}</p>
    <p><strong>Ruleset:</strong> ${attestation.rulesetId}</p>
    <p><strong>Validator:</strong> ${attestation.validatorVersion}</p>
    <div class="node"><strong>Graph Hash</strong><br><code>${attestation.graphHash.slice(0, 24)}...</code></div>
    <div class="node"><strong>Trace Hash</strong><br><code>${attestation.traceHash.slice(0, 24)}...</code></div>
  `;
}

document.querySelector<HTMLButtonElement>("#runBtn")!.addEventListener("click", () => {
  runFlow().catch((err: unknown) => {
    status.textContent = `Run failed: ${String(err)}`;
  });
});

document.querySelector<HTMLButtonElement>("#clearBtn")!.addEventListener("click", () => {
  summaryEl.textContent = "";
  conceptsEl.textContent = "";
  relationsEl.textContent = "";
  validationEl.textContent = "";
  tracesEl.textContent = "";
  attestationEl.textContent = "";
  exportedEl.textContent = "No export yet.";
  currentSessionId = "";
  currentValidation = null;
  raw.textContent = "No run yet.";
  status.textContent = "";
});
