import { createHash } from "node:crypto";
import type { Concept, Relation, RelationType } from "../contracts/generated-types.js";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "into",
  "when",
  "where",
  "which",
  "their",
  "there",
  "about",
  "would",
  "should",
  "could",
]);

function id(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

export function extractConcepts(text: string, maxConcepts: number): Concept[] {
  const tokens = text
    .split(/[^A-Za-z0-9_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && /^[A-Za-z]/.test(t));

  const freq = new Map<string, number>();
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (STOPWORDS.has(normalized)) {
      continue;
    }
    freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxConcepts)
    .map(([label, count]) => ({
      conceptId: id("concept", label),
      label,
      confidence: Math.min(0.99, 0.5 + count / 20),
      evidenceIds: [id("evidence", `concept:${label}`)],
    }));
}

function relationTypeForSentence(sentence: string): RelationType | null {
  const s = sentence.toLowerCase();
  if (s.includes("conflicts with") || s.includes("contradicts")) return "conflicts_with";
  if (s.includes("requires") || s.includes("depends on")) return "requires";
  if (s.includes("is a type of") || s.includes("is a kind of") || s.includes("subsumes")) return "subsumes";
  if (s.includes("also known as") || s.includes("equivalent to")) return "equivalent_to";
  if (s.includes("related to")) return "related_to";
  return null;
}

function guessTwoTerms(sentence: string): [string, string] | null {
  const terms = sentence
    .split(/[^A-Za-z0-9_]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  if (terms.length < 2) return null;
  return [terms[0], terms[1]];
}

export function inferRelations(text: string): Relation[] {
  const sentences = text.split(/[.!?]\s+/);
  const relations: Relation[] = [];

  for (const sentence of sentences) {
    const type = relationTypeForSentence(sentence);
    if (!type) continue;
    const pair = guessTwoTerms(sentence);
    if (!pair) continue;

    const [fromTerm, toTerm] = pair;
    const raw = `${fromTerm}:${type}:${toTerm}`;

    relations.push({
      relationId: id("relation", raw),
      fromConceptId: id("concept", fromTerm),
      toConceptId: id("concept", toTerm),
      type,
      confidence: 0.7,
      evidenceIds: [id("evidence", sentence)],
    });
  }

  return dedupeRelations(relations);
}

function dedupeRelations(relations: Relation[]): Relation[] {
  const seen = new Set<string>();
  const unique: Relation[] = [];

  for (const relation of relations) {
    const key = `${relation.fromConceptId}:${relation.type}:${relation.toConceptId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(relation);
  }

  return unique;
}
