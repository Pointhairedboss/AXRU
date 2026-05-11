import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { z } from "zod";
import type {
  AttestationBundle,
  Conflict,
  GraphSnapshot,
  Relation,
  RepairAction,
  Trace,
  ValidationReport,
} from "./contracts/generated-types.js";
import { attestWithRust, repairWithRust, validateGraphWithRust } from "./adapters/rustCoreAdapter.js";
import { extractConcepts, inferRelations } from "./services/extractor.js";
import { MemoryStore } from "./store/memoryStore.js";

const store = new MemoryStore();

type ErrorDetails = Record<string, unknown> | unknown[];

function getRustCoreMode(): "auto" | "0" | "1" {
  const value = process.env.AXIOMATE_USE_RUST_CORE;
  if (value === "0" || value === "1") {
    return value;
  }
  return "auto";
}

const uploadSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.enum(["text/plain", "text/markdown", "application/pdf"]),
  contentBase64: z.string().min(1),
});

const extractSchema = z
  .object({
    maxConcepts: z.number().int().min(1).max(500).optional(),
    includeLowConfidence: z.boolean().optional(),
  })
  .optional();

const validateSchema = z
  .object({
    rulesetId: z.string().default("axiomate-mvp-v1").optional(),
    strictMode: z.boolean().default(true).optional(),
  })
  .optional();

const repairSchema = z.object({
  conflictId: z.string().min(1),
  actionType: z.enum([
    "merge_equivalence",
    "reverse_edge",
    "demote_relation",
    "quarantine_relation",
    "mark_resolved",
  ]),
  payload: z.record(z.unknown()).optional(),
});

const verifySchema = z.object({
  attestation: z.object({
    attestationId: z.string(),
    runId: z.string(),
    graphHash: z.string(),
    evidenceHash: z.string(),
    traceHash: z.string(),
    rulesetId: z.string(),
    validatorVersion: z.string(),
  }),
});

function sha256Of(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildValidationFallback(graph: GraphSnapshot): ValidationReport {
  const conflicts: Conflict[] = [];
  const relationKeyMap = new Map<string, Relation>();

  for (const relation of graph.relations) {
    relationKeyMap.set(`${relation.fromConceptId}:${relation.type}:${relation.toConceptId}`, relation);
    if (relation.type === "conflicts_with") {
      conflicts.push({
        conflictId: `conflict_${relation.relationId}`,
        severity: "high",
        code: "EXPLICIT_CONTRADICTION",
        message: `Explicit conflict relation detected: ${relation.relationId}`,
        relatedIds: [relation.fromConceptId, relation.toConceptId, relation.relationId],
      });
    }
  }

  for (const relation of graph.relations) {
    if (relation.type !== "subsumes") {
      continue;
    }
    const reverse = relationKeyMap.get(`${relation.toConceptId}:subsumes:${relation.fromConceptId}`);
    if (!reverse) {
      continue;
    }

    const ordered = [relation.relationId, reverse.relationId].sort().join(":");
    const conflictId = `conflict_cycle_${ordered}`;
    if (conflicts.some((c) => c.conflictId === conflictId)) {
      continue;
    }

    conflicts.push({
      conflictId,
      severity: "high",
      code: "RECIPROCAL_SUBSUMPTION",
      message: "Reciprocal subsumption detected",
      relatedIds: [relation.fromConceptId, relation.toConceptId, relation.relationId, reverse.relationId],
    });
  }

  return {
    runId: graph.runId,
    overallStatus: conflicts.length > 0 ? "repair_pending" : "valid",
    conflicts,
    suggestedRepairs: conflicts.map((c) => ({
      conflictId: c.conflictId,
      actionType: c.code === "RECIPROCAL_SUBSUMPTION" ? "reverse_edge" : "quarantine_relation",
      payload: { relatedIds: c.relatedIds },
    })),
  };
}

function buildTraces(graph: GraphSnapshot): Trace[] {
  const conceptTraces: Trace[] = graph.concepts.map((concept) => ({
    traceId: `trace_concept_${concept.conceptId}`,
    entityType: "concept",
    entityId: concept.conceptId,
    steps: [
      {
        index: 1,
        ruleId: "extract.frequency",
        operation: "concept_extracted",
        inputEvidenceIds: concept.evidenceIds,
        confidence: concept.confidence,
      },
    ],
  }));

  const relationTraces: Trace[] = graph.relations.map((relation) => ({
    traceId: `trace_relation_${relation.relationId}`,
    entityType: "relation",
    entityId: relation.relationId,
    steps: [
      {
        index: 1,
        ruleId: `infer.${relation.type}`,
        operation: "relation_inferred",
        inputEvidenceIds: relation.evidenceIds,
        confidence: relation.confidence,
      },
    ],
  }));

  return [...conceptTraces, ...relationTraces];
}

async function buildValidation(graph: GraphSnapshot): Promise<ValidationReport> {
  const rustCoreMode = getRustCoreMode();
  if (rustCoreMode !== "0") {
    try {
      return await validateGraphWithRust(graph);
    } catch (error) {
      if (rustCoreMode === "1") {
        throw error;
      }
    }
  }

  return buildValidationFallback(graph);
}

async function buildAttestation(
  graph: GraphSnapshot,
  traces: Trace[]
): Promise<AttestationBundle> {
  const rustCoreMode = getRustCoreMode();
  if (rustCoreMode !== "0") {
    try {
      return await attestWithRust(graph, traces, "axiomate-mvp-v1", "0.1.0");
    } catch (error) {
      if (rustCoreMode === "1") {
        throw error;
      }
    }
  }

  const evidenceHash = sha256Of([
    ...graph.concepts.flatMap((c) => c.evidenceIds),
    ...graph.relations.flatMap((r) => r.evidenceIds),
  ]);

  return {
    attestationId: randomUUID(),
    runId: graph.runId,
    graphHash: sha256Of(graph),
    evidenceHash,
    traceHash: sha256Of(traces),
    rulesetId: "axiomate-mvp-v1",
    validatorVersion: "0.1.0",
  };
}

function applyRepairFallback(
  graph: GraphSnapshot,
  validation: ValidationReport,
  action: RepairAction
): GraphSnapshot {
  const targetConflict = validation.conflicts.find((c) => c.conflictId === action.conflictId);
  if (!targetConflict) {
    throw new Error(`Unknown conflict: ${action.conflictId}`);
  }

  let updatedRelations = [...graph.relations];
  if (action.actionType === "quarantine_relation") {
    const relationId = targetConflict.relatedIds.find((id) => id.startsWith("relation_"));
    if (relationId) {
      updatedRelations = updatedRelations.filter((r) => r.relationId !== relationId);
    }
  }
  if (action.actionType === "reverse_edge") {
    const relationId = targetConflict.relatedIds.find((id) => id.startsWith("relation_"));
    if (relationId) {
      updatedRelations = updatedRelations.map((r) => {
        if (r.relationId !== relationId) {
          return r;
        }
        return {
          ...r,
          fromConceptId: r.toConceptId,
          toConceptId: r.fromConceptId,
        };
      });
    }
  }
  if (action.actionType === "demote_relation") {
    const relationId = targetConflict.relatedIds.find((id) => id.startsWith("relation_"));
    if (relationId) {
      updatedRelations = updatedRelations.map((r) =>
        r.relationId === relationId ? { ...r, type: "related_to" } : r
      );
    }
  }

  return {
    runId: graph.runId,
    concepts: graph.concepts,
    relations: updatedRelations,
  };
}

async function applyRepairAction(
  graph: GraphSnapshot,
  validation: ValidationReport,
  action: RepairAction
): Promise<GraphSnapshot> {
  const rustCoreMode = getRustCoreMode();
  if (rustCoreMode !== "0") {
    try {
      return await repairWithRust(graph, validation, action);
    } catch (error) {
      if (rustCoreMode === "1") {
        throw error;
      }
    }
  }

  return applyRepairFallback(graph, validation, action);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
): void {
  const errorPayload: { code: string; message: string; details?: ErrorDetails } = { code, message };
  if (details !== undefined) {
    errorPayload.details = details;
  }
  sendJson(res, status, { error: errorPayload });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleRoute(req, res).catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      sendError(res, 400, "VALIDATION_ERROR", "Request payload failed schema validation", {
        issues: error.issues,
      });
      return;
    }

    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = message === "INVALID_JSON" ? 400 : message.toLowerCase().includes("not found") ? 404 : 500;
    const code = message === "INVALID_JSON" ? "INVALID_JSON" : status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";
    sendError(res, status, code, message);
  });
}

async function handleRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!req.url || !req.method) {
    sendError(res, 400, "BAD_REQUEST", "Missing method or URL");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/v1/sessions") {
    const session = store.createSession();
    sendJson(res, 201, session);
    return;
  }

  const docMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/documents$/);
  if (req.method === "POST" && docMatch) {
    const sessionId = docMatch[1];
    const body = uploadSchema.parse(await readBody(req));

    const text = Buffer.from(body.contentBase64, "base64").toString("utf8");
    const document = store.addDocument(sessionId, {
      filename: body.filename,
      mediaType: body.mediaType,
      parseStatus: text.length > 0 ? "parsed" : "failed",
      sizeBytes: text.length,
      text,
    });

    sendJson(res, 201, {
      documentId: document.documentId,
      sessionId,
      filename: document.filename,
      mediaType: document.mediaType,
      sizeBytes: document.sizeBytes,
      parseStatus: document.parseStatus,
    });
    return;
  }

  const extractMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/extract$/);
  if (req.method === "POST" && extractMatch) {
    const sessionId = extractMatch[1];
    const body = extractSchema.parse(await readBody(req));
    const docs = store.getDocuments(sessionId);
    const text = docs.map((d) => d.text).join("\n");

    const run = store.addRun(sessionId, "extract", "extracted");
    const concepts = extractConcepts(text, body?.maxConcepts ?? 100);
    const relations = inferRelations(text);
    store.saveGraph(sessionId, concepts, relations, run.runId);
    store.addRun(sessionId, "graph", "graph_built");

    sendJson(res, 202, {
      runId: run.runId,
      sessionId,
      runVersion: run.runVersion,
      stage: run.stage,
      status: run.status,
      diagnostics: [],
    });
    return;
  }

  const graphMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/graph$/);
  if (req.method === "GET" && graphMatch) {
    const sessionId = graphMatch[1];
    const graph = store.getGraph(sessionId);
    if (!graph) {
      sendError(res, 404, "GRAPH_NOT_FOUND", "No graph has been built for this session");
      return;
    }
    sendJson(res, 200, graph);
    return;
  }

  const validateMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/validate$/);
  if (req.method === "POST" && validateMatch) {
    const sessionId = validateMatch[1];
    validateSchema.parse(await readBody(req));
    const graph = store.getGraph(sessionId);
    if (!graph) {
      sendError(res, 404, "GRAPH_NOT_FOUND", "No graph available to validate");
      return;
    }

    const validationRun = store.addRun(
      sessionId,
      "validate",
      graph.relations.length > 0 ? "validated" : "failed"
    );
    const validation = await buildValidation({ ...graph, runId: validationRun.runId });
    store.saveValidation(sessionId, validation);
    store.saveTraces(sessionId, buildTraces(graph));

    sendJson(res, 200, validation);
    return;
  }

  const repairMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/repairs$/);
  if (req.method === "POST" && repairMatch) {
    const sessionId = repairMatch[1];
    const idempotencyKey = req.headers["x-idempotency-key"];
    const parsed = repairSchema.parse(await readBody(req));

    if (typeof idempotencyKey === "string") {
      const existing = store.getRepairByIdempotencyKey(sessionId, idempotencyKey);
      if (existing) {
        sendJson(res, 200, existing);
        return;
      }
    }

    const graph = store.getGraph(sessionId);
    const validation = store.getValidation(sessionId);
    if (!graph || !validation) {
      sendError(res, 404, "VALIDATION_NOT_FOUND", "Run validate before applying repairs");
      return;
    }

    const targetConflict = validation.conflicts.find((c) => c.conflictId === parsed.conflictId);
    if (!targetConflict) {
      sendError(res, 404, "CONFLICT_NOT_FOUND", `Unknown conflict: ${parsed.conflictId}`);
      return;
    }

    const updatedGraph = await applyRepairAction(graph, validation, parsed);

    const repairRun = store.addRun(sessionId, "repair", "repair_pending");
    store.saveGraph(sessionId, updatedGraph.concepts, updatedGraph.relations, repairRun.runId);
    const postRepairValidation = await buildValidation({
      runId: repairRun.runId,
      concepts: updatedGraph.concepts,
      relations: updatedGraph.relations,
    });
    store.saveValidation(sessionId, postRepairValidation);

    const response = {
      runId: repairRun.runId,
      sessionId,
      runVersion: repairRun.runVersion,
      stage: repairRun.stage,
      status: postRepairValidation.overallStatus === "valid" ? "valid" : repairRun.status,
    };

    if (typeof idempotencyKey === "string") {
      store.setRepairByIdempotencyKey(sessionId, idempotencyKey, response);
    }

    sendJson(res, 200, response);
    return;
  }

  const tracesMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/traces$/);
  if (req.method === "GET" && tracesMatch) {
    const sessionId = tracesMatch[1];
    const traces = store.getTraces(sessionId);
    sendJson(res, 200, { traces });
    return;
  }

  const attestMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/attest$/);
  if (req.method === "POST" && attestMatch) {
    const sessionId = attestMatch[1];
    const graph = store.getGraph(sessionId);
    if (!graph) {
      sendError(res, 404, "GRAPH_NOT_FOUND", "No graph available for attestation");
      return;
    }

    const traces = store.getTraces(sessionId);
    const attestation = await buildAttestation(graph, traces);

    store.saveAttestation(sessionId, attestation);
    store.addRun(sessionId, "attest", "attested");
    sendJson(res, 200, attestation);
    return;
  }

  if (req.method === "POST" && pathname === "/api/v1/attestations/verify") {
    const body = verifySchema.parse(await readBody(req));
    const checks = [
      {
        name: "hash-length",
        passed:
          body.attestation.graphHash.length === 64 &&
          body.attestation.evidenceHash.length === 64 &&
          body.attestation.traceHash.length === 64,
        detail: "All hash fields should be 64-char sha256 hex strings",
      },
      {
        name: "required-metadata",
        passed: Boolean(body.attestation.rulesetId && body.attestation.validatorVersion),
        detail: "rulesetId and validatorVersion must be present",
      },
    ];
    sendJson(res, 200, {
      valid: checks.every((c) => c.passed),
      checks,
    });
    return;
  }

  const exportMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/export$/);
  if (req.method === "GET" && exportMatch) {
    const sessionId = exportMatch[1];
    const format = url.searchParams.get("format");
    if (!format || !["json", "txt", "svg", "ttl", "cypher"].includes(format)) {
      sendError(res, 400, "INVALID_FORMAT", "format must be one of json, txt, svg, ttl, cypher", {
        allowedFormats: ["json", "txt", "svg", "ttl", "cypher"],
      });
      return;
    }

    const graph = store.getGraph(sessionId);
    if (!graph) {
      sendError(res, 404, "GRAPH_NOT_FOUND", "No graph available to export");
      return;
    }

    const validation = store.getValidation(sessionId);
    const attestation = store.getAttestation(sessionId);
    let artifact: string;

    if (format === "json") {
      artifact = JSON.stringify({ graph, validation, attestation }, null, 2);
    } else if (format === "txt") {
      artifact = [
        `Run: ${graph.runId}`,
        `Concepts: ${graph.concepts.length}`,
        `Relations: ${graph.relations.length}`,
        `Conflicts: ${validation?.conflicts.length ?? 0}`,
        `Attestation: ${attestation?.attestationId ?? "N/A"}`,
      ].join("\n");
    } else {
      artifact = `Format '${format}' is feature-flagged for Sprint 1.`;
    }

    store.addRun(sessionId, "export", "exported");
    sendJson(res, 200, {
      format,
      artifact,
      attestationId: attestation?.attestationId,
    });
    return;
  }

  sendError(res, 404, "NOT_FOUND", `No route for ${req.method} ${pathname}`);
}

export function createAppServer(): Server {
  return createServer(route);
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8787);
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`[axiomate-explorer-api] listening on ${port}`);
  });
}
