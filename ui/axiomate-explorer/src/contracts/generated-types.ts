export interface Concept {
  conceptId: string;
  label: string;
  confidence: number;
}

export interface Relation {
  relationId: string;
  fromConceptId: string;
  toConceptId: string;
  type: string;
}

export interface GraphSnapshot {
  runId: string;
  concepts: Concept[];
  relations: Relation[];
}

export interface Conflict {
  conflictId: string;
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
  relatedIds: string[];
}

export interface ValidationReport {
  runId: string;
  overallStatus: "valid" | "repair_pending" | "failed";
  conflicts: Conflict[];
}

export interface TraceStep {
  index: number;
  ruleId: string;
  operation: string;
  confidence: number;
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
}
