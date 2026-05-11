import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type {
  AttestationBundle,
  GraphSnapshot,
  RepairAction,
  Trace,
  ValidationReport,
} from "../contracts/generated-types.js";

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_PREVIEW = 500;

function resolveRepoRoot(): string {
  const fromEnv = process.env.AXIOMATE_REPO_ROOT?.trim();
  if (fromEnv) {
    return resolve(process.cwd(), fromEnv);
  }
  return resolve(process.cwd(), "..", "..", "..");
}

function getTimeoutMs(): number {
  const raw = process.env.AXIOMATE_RUST_CORE_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsed;
}

function preview(value: string): string {
  if (value.length <= MAX_OUTPUT_PREVIEW) {
    return value;
  }
  return `${value.slice(0, MAX_OUTPUT_PREVIEW)}...`;
}

function buildRustCommand(command: "validate" | "attest" | "repair"): {
  cwd: string;
  executable: string;
  args: string[];
} {
  const root = resolveRepoRoot();
  const directBin = process.env.AXIOMATE_RUST_CORE_BIN?.trim();
  if (directBin) {
    return {
      cwd: root,
      executable: directBin,
      args: [command],
    };
  }

  const manifestPath = resolve(root, "crates", "axiomate-explorer-core", "Cargo.toml");
  return {
    cwd: root,
    executable: "cargo",
    args: [
      "run",
      "--quiet",
      "--manifest-path",
      manifestPath,
      "--bin",
      "axiomate-explorer-core-cli",
      "--",
      command,
    ],
  };
}

function mapGraph(graph: GraphSnapshot): unknown {
  return {
    runId: graph.runId,
    concepts: graph.concepts.map((concept) => ({
      conceptId: concept.conceptId,
      label: concept.label,
      confidence: concept.confidence,
      evidenceIds: concept.evidenceIds,
    })),
    relations: graph.relations.map((relation) => ({
      relationId: relation.relationId,
      fromConceptId: relation.fromConceptId,
      toConceptId: relation.toConceptId,
      type: relation.type,
      confidence: relation.confidence,
      evidenceIds: relation.evidenceIds,
    })),
  };
}

function runRustCli<T>(command: "validate" | "attest" | "repair", payload: unknown): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    const rustCommand = buildRustCommand(command);
    const timeoutMs = getTimeoutMs();
    const child = spawn(rustCommand.executable, rustCommand.args, {
      cwd: rustCommand.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeoutHandle = setTimeout(() => {
      if (finished) {
        return;
      }
      child.kill();
      reject(
        new Error(
          `Rust core ${command} timed out after ${timeoutMs}ms (cwd=${rustCommand.cwd}, executable=${rustCommand.executable})`
        )
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finished = true;
      clearTimeout(timeoutHandle);
      reject(
        new Error(
          `Failed to start Rust core ${command} (cwd=${rustCommand.cwd}, executable=${rustCommand.executable}): ${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      finished = true;
      clearTimeout(timeoutHandle);

      if (code !== 0) {
        reject(
          new Error(
            [
              `Rust core ${command} exited with code ${code} (cwd=${rustCommand.cwd}, executable=${rustCommand.executable})`,
              stderr.trim() ? `stderr=${preview(stderr.trim())}` : undefined,
            ]
              .filter(Boolean)
              .join("; ")
          )
        );
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout) as T);
      } catch (error) {
        reject(
          new Error(
            `Rust core ${command} returned non-JSON output (cwd=${rustCommand.cwd}, executable=${rustCommand.executable}): ${preview(
              stdout.trim()
            )}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function validateGraphWithRust(graph: GraphSnapshot): Promise<ValidationReport> {
  return runRustCli<ValidationReport>("validate", {
    graph: mapGraph(graph),
  });
}

export async function attestWithRust(
  graph: GraphSnapshot,
  traces: Trace[],
  rulesetId: string,
  validatorVersion: string
): Promise<AttestationBundle> {
  return runRustCli<AttestationBundle>("attest", {
    graph: mapGraph(graph),
    traces,
    rulesetId,
    validatorVersion,
  });
}

export async function repairWithRust(
  graph: GraphSnapshot,
  validation: ValidationReport,
  repairAction: RepairAction
): Promise<GraphSnapshot> {
  return runRustCli<GraphSnapshot>("repair", {
    graph: mapGraph(graph),
    validation,
    repairAction,
  });
}