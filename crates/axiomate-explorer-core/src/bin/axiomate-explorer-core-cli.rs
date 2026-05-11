use std::env;
use std::io::{self, Read};

use axiomate_explorer_core::{
    apply_repair, attest, validate_graph, GraphSnapshot, RepairAction, Trace, ValidationReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ValidateRequest {
    graph: GraphSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AttestRequest {
    graph: GraphSnapshot,
    traces: Vec<Trace>,
    ruleset_id: String,
    validator_version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RepairRequest {
    graph: GraphSnapshot,
    validation: ValidationReport,
    repair_action: RepairAction,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

fn main() {
    let command = env::args().nth(1).unwrap_or_default();
    let mut input = String::new();
    if let Err(error) = io::stdin().read_to_string(&mut input) {
        print_error(&format!("failed to read stdin: {error}"));
        std::process::exit(1);
    }

    match command.as_str() {
        "validate" => run_validate(&input),
        "attest" => run_attest(&input),
        "repair" => run_repair(&input),
        _ => {
            print_error("expected first argument to be 'validate', 'attest', or 'repair'");
            std::process::exit(1);
        }
    }
}

fn run_validate(input: &str) {
    let request: ValidateRequest = match serde_json::from_str(input) {
        Ok(request) => request,
        Err(error) => {
            print_error(&format!("invalid validate request: {error}"));
            std::process::exit(1);
        }
    };

    let report = validate_graph(&request.graph);
    println!("{}", serde_json::to_string(&report).unwrap_or_else(|_| "{}".to_string()));
}

fn run_attest(input: &str) {
    let request: AttestRequest = match serde_json::from_str(input) {
        Ok(request) => request,
        Err(error) => {
            print_error(&format!("invalid attest request: {error}"));
            std::process::exit(1);
        }
    };

    match attest(
        &request.graph,
        &request.traces,
        &request.ruleset_id,
        &request.validator_version,
    ) {
        Ok(bundle) => println!("{}", serde_json::to_string(&bundle).unwrap_or_else(|_| "{}".to_string())),
        Err(error) => {
            print_error(&error.to_string());
            std::process::exit(1);
        }
    }
}

fn print_error(message: &str) {
    let payload = ErrorResponse {
        error: message.to_string(),
    };
    eprintln!("{}", serde_json::to_string(&payload).unwrap_or_else(|_| "{\"error\":\"unknown\"}".to_string()));
}

fn run_repair(input: &str) {
    let request: RepairRequest = match serde_json::from_str(input) {
        Ok(request) => request,
        Err(error) => {
            print_error(&format!("invalid repair request: {error}"));
            std::process::exit(1);
        }
    };

    match apply_repair(&request.graph, &request.validation, &request.repair_action) {
        Ok(graph) => println!("{}", serde_json::to_string(&graph).unwrap_or_else(|_| "{}".to_string())),
        Err(error) => {
            print_error(&error.to_string());
            std::process::exit(1);
        }
    }
}