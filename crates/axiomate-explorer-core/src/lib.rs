use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ExplorerError {
    #[error("invalid input: {0}")]
    InvalidInput(String),
}

pub type Result<T> = std::result::Result<T, ExplorerError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Concept {
    pub concept_id: String,
    pub label: String,
    pub confidence: f32,
    pub evidence_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Relation {
    pub relation_id: String,
    pub from_concept_id: String,
    pub to_concept_id: String,
    #[serde(rename = "type")]
    pub relation_type: String,
    pub confidence: f32,
    pub evidence_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphSnapshot {
    pub run_id: String,
    pub concepts: Vec<Concept>,
    pub relations: Vec<Relation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conflict {
    pub conflict_id: String,
    pub severity: String,
    pub code: String,
    pub message: String,
    pub related_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepairAction {
    pub conflict_id: String,
    pub action_type: String,
    pub payload: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub run_id: String,
    pub overall_status: String,
    pub conflicts: Vec<Conflict>,
    pub suggested_repairs: Vec<RepairAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceStep {
    pub index: u32,
    pub rule_id: String,
    pub operation: String,
    pub input_evidence_ids: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trace {
    pub trace_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub steps: Vec<TraceStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttestationBundle {
    pub attestation_id: String,
    pub run_id: String,
    pub graph_hash: String,
    pub evidence_hash: String,
    pub trace_hash: String,
    pub ruleset_id: String,
    pub validator_version: String,
    pub signature: Option<String>,
}

pub fn validate_graph(snapshot: &GraphSnapshot) -> ValidationReport {
    let mut conflicts = Vec::new();

    for relation in &snapshot.relations {
        if relation.from_concept_id == relation.to_concept_id {
            conflicts.push(Conflict {
                conflict_id: format!("conflict_self_{}", relation.relation_id),
                severity: "high".to_string(),
                code: "SELF_CYCLE".to_string(),
                message: format!("Self-cycle relation: {}", relation.relation_id),
                related_ids: vec![relation.from_concept_id.clone(), relation.relation_id.clone()],
            });
        }

        if relation.relation_type == "conflicts_with" {
            conflicts.push(Conflict {
                conflict_id: format!("conflict_explicit_{}", relation.relation_id),
                severity: "high".to_string(),
                code: "EXPLICIT_CONTRADICTION".to_string(),
                message: format!("Explicit conflict relation: {}", relation.relation_id),
                related_ids: vec![
                    relation.from_concept_id.clone(),
                    relation.to_concept_id.clone(),
                    relation.relation_id.clone(),
                ],
            });
        }
    }

    for relation in &snapshot.relations {
        if relation.relation_type != "subsumes" {
            continue;
        }

        let reverse = snapshot.relations.iter().find(|candidate| {
            candidate.relation_type == "subsumes"
                && candidate.from_concept_id == relation.to_concept_id
                && candidate.to_concept_id == relation.from_concept_id
        });

        if let Some(reverse) = reverse {
            let ordered = if relation.relation_id < reverse.relation_id {
                format!("{}:{}", relation.relation_id, reverse.relation_id)
            } else {
                format!("{}:{}", reverse.relation_id, relation.relation_id)
            };
            let conflict_id = format!("conflict_cycle_{ordered}");
            if conflicts.iter().any(|conflict| conflict.conflict_id == conflict_id) {
                continue;
            }

            conflicts.push(Conflict {
                conflict_id,
                severity: "high".to_string(),
                code: "RECIPROCAL_SUBSUMPTION".to_string(),
                message: "Reciprocal subsumption detected".to_string(),
                related_ids: vec![
                    relation.from_concept_id.clone(),
                    relation.to_concept_id.clone(),
                    relation.relation_id.clone(),
                    reverse.relation_id.clone(),
                ],
            });
        }
    }

    let suggested_repairs = conflicts
        .iter()
        .map(|conflict| RepairAction {
            conflict_id: conflict.conflict_id.clone(),
            action_type: if conflict.code == "RECIPROCAL_SUBSUMPTION" {
                "reverse_edge".to_string()
            } else {
                "quarantine_relation".to_string()
            },
            payload: None,
        })
        .collect();

    ValidationReport {
        run_id: snapshot.run_id.clone(),
        overall_status: if conflicts.is_empty() {
            "valid".to_string()
        } else {
            "repair_pending".to_string()
        },
        conflicts,
        suggested_repairs,
    }
}

pub fn attest(
    snapshot: &GraphSnapshot,
    traces: &[Trace],
    ruleset_id: &str,
    validator_version: &str,
) -> Result<AttestationBundle> {
    if ruleset_id.is_empty() {
        return Err(ExplorerError::InvalidInput("ruleset_id must not be empty".to_string()));
    }

    let encoded = serde_json::to_vec(snapshot)
        .map_err(|e| ExplorerError::InvalidInput(format!("failed to encode graph: {e}")))?;

    let mut hasher = Sha256::new();
    hasher.update(encoded);
    let graph_hash = format!("{:x}", hasher.finalize());

    let evidence_ids: Vec<String> = snapshot
        .concepts
        .iter()
        .flat_map(|concept| concept.evidence_ids.iter().cloned())
        .chain(
            snapshot
                .relations
                .iter()
                .flat_map(|relation| relation.evidence_ids.iter().cloned()),
        )
        .collect();

    let evidence_hash = format!("{:x}", Sha256::digest(serde_json::to_vec(&evidence_ids).unwrap_or_default()));
    let trace_hash = format!("{:x}", Sha256::digest(serde_json::to_vec(traces).unwrap_or_default()));

    Ok(AttestationBundle {
        attestation_id: format!("attestation-{}", &graph_hash[..12]),
        run_id: snapshot.run_id.clone(),
        graph_hash,
        evidence_hash,
        trace_hash,
        ruleset_id: ruleset_id.to_string(),
        validator_version: validator_version.to_string(),
        signature: None,
    })
}

pub fn apply_repair(
    snapshot: &GraphSnapshot,
    validation: &ValidationReport,
    action: &RepairAction,
) -> Result<GraphSnapshot> {
    let target_conflict = validation
        .conflicts
        .iter()
        .find(|conflict| conflict.conflict_id == action.conflict_id)
        .ok_or_else(|| ExplorerError::InvalidInput(format!("unknown conflict: {}", action.conflict_id)))?;

    let mut updated_relations = snapshot.relations.clone();
    let target_relation_id = target_conflict
        .related_ids
        .iter()
        .find(|id| id.starts_with("relation_"))
        .cloned();

    match action.action_type.as_str() {
        "quarantine_relation" => {
            if let Some(relation_id) = target_relation_id {
                updated_relations.retain(|relation| relation.relation_id != relation_id);
            }
        }
        "reverse_edge" => {
            if let Some(relation_id) = target_relation_id {
                for relation in &mut updated_relations {
                    if relation.relation_id != relation_id {
                        continue;
                    }
                    let old_from = relation.from_concept_id.clone();
                    relation.from_concept_id = relation.to_concept_id.clone();
                    relation.to_concept_id = old_from;
                }
            }
        }
        "demote_relation" => {
            if let Some(relation_id) = target_relation_id {
                for relation in &mut updated_relations {
                    if relation.relation_id == relation_id {
                        relation.relation_type = "related_to".to_string();
                    }
                }
            }
        }
        "merge_equivalence" | "mark_resolved" => {
            // No structural edge mutation for these actions in MVP.
        }
        other => {
            return Err(ExplorerError::InvalidInput(format!(
                "unsupported action type: {other}"
            )));
        }
    }

    Ok(GraphSnapshot {
        run_id: snapshot.run_id.clone(),
        concepts: snapshot.concepts.clone(),
        relations: updated_relations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_flags_self_cycles() {
        let graph = GraphSnapshot {
            run_id: "run-1".to_string(),
            concepts: vec![],
            relations: vec![Relation {
                relation_id: "r1".to_string(),
                from_concept_id: "c1".to_string(),
                to_concept_id: "c1".to_string(),
                relation_type: "related_to".to_string(),
                confidence: 0.8,
                evidence_ids: vec!["e1".to_string()],
            }],
        };

        let report = validate_graph(&graph);
        assert_eq!(report.overall_status, "repair_pending");
        assert!(!report.conflicts.is_empty());
    }

    #[test]
    fn attest_produces_hash() {
        let graph = GraphSnapshot {
            run_id: "run-2".to_string(),
            concepts: vec![Concept {
                concept_id: "c1".to_string(),
                label: "risk".to_string(),
                confidence: 0.9,
                evidence_ids: vec!["e1".to_string()],
            }],
            relations: vec![],
        };

        let traces = vec![Trace {
            trace_id: "t1".to_string(),
            entity_type: "concept".to_string(),
            entity_id: "c1".to_string(),
            steps: vec![TraceStep {
                index: 1,
                rule_id: "extract.frequency".to_string(),
                operation: "concept_extracted".to_string(),
                input_evidence_ids: vec!["e1".to_string()],
                confidence: 0.9,
            }],
        }];

        let bundle = attest(&graph, &traces, "axiomate-mvp-v1", "0.1.0").expect("attest should succeed");
        assert_eq!(bundle.run_id, "run-2");
        assert_eq!(bundle.graph_hash.len(), 64);
        assert_eq!(bundle.evidence_hash.len(), 64);
        assert_eq!(bundle.trace_hash.len(), 64);
    }

    #[test]
    fn repair_quarantine_removes_target_relation() {
        let graph = GraphSnapshot {
            run_id: "run-3".to_string(),
            concepts: vec![],
            relations: vec![Relation {
                relation_id: "relation_abc".to_string(),
                from_concept_id: "c1".to_string(),
                to_concept_id: "c2".to_string(),
                relation_type: "conflicts_with".to_string(),
                confidence: 0.8,
                evidence_ids: vec!["e1".to_string()],
            }],
        };

        let validation = ValidationReport {
            run_id: "run-3".to_string(),
            overall_status: "repair_pending".to_string(),
            conflicts: vec![Conflict {
                conflict_id: "conflict_1".to_string(),
                severity: "high".to_string(),
                code: "EXPLICIT_CONTRADICTION".to_string(),
                message: "Explicit conflict relation: relation_abc".to_string(),
                related_ids: vec!["c1".to_string(), "c2".to_string(), "relation_abc".to_string()],
            }],
            suggested_repairs: vec![],
        };

        let repaired = apply_repair(
            &graph,
            &validation,
            &RepairAction {
                conflict_id: "conflict_1".to_string(),
                action_type: "quarantine_relation".to_string(),
                payload: None,
            },
        )
        .expect("repair should succeed");

        assert!(repaired.relations.is_empty());
    }
}
