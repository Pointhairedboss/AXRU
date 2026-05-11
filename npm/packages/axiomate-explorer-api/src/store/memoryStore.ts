import { randomUUID } from "node:crypto";
import type {
  AttestationBundle,
  Concept,
  DocumentRecord,
  GraphSnapshot,
  PipelineRun,
  Relation,
  Session,
  Trace,
  ValidationReport,
} from "../contracts/generated-types.js";

interface SessionState {
  session: Session;
  documents: DocumentRecord[];
  graph?: GraphSnapshot;
  runs: PipelineRun[];
  validation?: ValidationReport;
  traces: Trace[];
  attestation?: AttestationBundle;
  repairIdempotency: Map<string, PipelineRun>;
}

export class MemoryStore {
  private readonly sessions = new Map<string, SessionState>();

  createSession(): Session {
    const session: Session = {
      sessionId: randomUUID(),
      status: "created",
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.sessionId, {
      session,
      documents: [],
      runs: [],
      traces: [],
      repairIdempotency: new Map<string, PipelineRun>(),
    });

    return session;
  }

  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  addDocument(
    sessionId: string,
    payload: Omit<DocumentRecord, "documentId" | "sessionId">
  ): DocumentRecord {
    const state = this.requireSession(sessionId);
    const document: DocumentRecord = {
      documentId: randomUUID(),
      sessionId,
      ...payload,
    };
    state.documents.push(document);
    state.session.status = "ingested";
    return document;
  }

  addRun(sessionId: string, stage: PipelineRun["stage"], status: PipelineRun["status"]): PipelineRun {
    const state = this.requireSession(sessionId);
    const run: PipelineRun = {
      runId: randomUUID(),
      sessionId,
      runVersion: state.runs.length + 1,
      stage,
      status,
    };
    state.runs.push(run);
    state.session.status = status;
    return run;
  }

  saveGraph(sessionId: string, concepts: Concept[], relations: Relation[], runId: string): GraphSnapshot {
    const state = this.requireSession(sessionId);
    const graph: GraphSnapshot = { runId, concepts, relations };
    state.graph = graph;
    return graph;
  }

  saveValidation(sessionId: string, validation: ValidationReport): ValidationReport {
    const state = this.requireSession(sessionId);
    state.validation = validation;
    return validation;
  }

  getValidation(sessionId: string): ValidationReport | undefined {
    return this.requireSession(sessionId).validation;
  }

  saveTraces(sessionId: string, traces: Trace[]): Trace[] {
    const state = this.requireSession(sessionId);
    state.traces = traces;
    return traces;
  }

  getTraces(sessionId: string): Trace[] {
    return this.requireSession(sessionId).traces;
  }

  saveAttestation(sessionId: string, attestation: AttestationBundle): AttestationBundle {
    const state = this.requireSession(sessionId);
    state.attestation = attestation;
    return attestation;
  }

  getAttestation(sessionId: string): AttestationBundle | undefined {
    return this.requireSession(sessionId).attestation;
  }

  getRepairByIdempotencyKey(sessionId: string, key: string): PipelineRun | undefined {
    return this.requireSession(sessionId).repairIdempotency.get(key);
  }

  setRepairByIdempotencyKey(sessionId: string, key: string, run: PipelineRun): void {
    this.requireSession(sessionId).repairIdempotency.set(key, run);
  }

  getGraph(sessionId: string): GraphSnapshot | undefined {
    return this.requireSession(sessionId).graph;
  }

  getDocuments(sessionId: string): DocumentRecord[] {
    return this.requireSession(sessionId).documents;
  }

  private requireSession(sessionId: string): SessionState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session '${sessionId}' not found`);
    }
    return state;
  }
}
