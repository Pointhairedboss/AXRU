export type RunStatus =
  | "created"
  | "ingested"
  | "extracted"
  | "graph_built"
  | "validated"
  | "repair_pending"
  | "valid"
  | "attested"
  | "exported"
  | "failed";

export type RelationType =
  | "subsumes"
  | "requires"
  | "conflicts_with"
  | "related_to"
  | "equivalent_to";

export interface Session {
  sessionId: string;
  status: RunStatus;
  createdAt: string;
}

export interface DocumentRecord {
  documentId: string;
  sessionId: string;
  filename: string;
  mediaType: "text/plain" | "text/markdown" | "application/pdf";
  parseStatus: "parsed" | "partial" | "failed";
  sizeBytes: number;
  text: string;
}

export interface Concept {
  conceptId: string;
  label: string;
  confidence: number;
  evidenceIds: string[];
}

export interface Relation {
  relationId: string;
  fromConceptId: string;
  toConceptId: string;
  type: RelationType;
  confidence: number;
  evidenceIds: string[];
}

export interface GraphSnapshot {
  runId: string;
  concepts: Concept[];
  relations: Relation[];
}

export interface PipelineRun {
  runId: string;
  sessionId: string;
  runVersion: number;
  stage: "extract" | "graph" | "validate" | "repair" | "attest" | "export";
  status: RunStatus;
}

export interface Conflict {
  conflictId: string;
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
  relatedIds: string[];
}

export interface RepairAction {
  conflictId: string;
  actionType:
    | "merge_equivalence"
    | "reverse_edge"
    | "demote_relation"
    | "quarantine_relation"
    | "mark_resolved";
  payload?: Record<string, unknown>;
}

export interface ValidationReport {
  runId: string;
  overallStatus: "valid" | "repair_pending" | "failed";
  conflicts: Conflict[];
  suggestedRepairs: RepairAction[];
}

export interface TraceStep {
  index: number;
  ruleId: string;
  operation: string;
  inputEvidenceIds: string[];
  confidence: number;
  beforeStateRef?: string;
  afterStateRef?: string;
}

export interface Trace {
  traceId: string;
  entityType: "concept" | "relation" | "validation";
  entityId: string;
  steps: TraceStep[];
}

export interface AttestationBundle {
  attestationId: string;
  runId: string;
  graphHash: string;
  evidenceHash: string;
  traceHash: string;
  rulesetId: string;
  validatorVersion: string;
  signature?: string;
}