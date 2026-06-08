#!/usr/bin/env python3
"""
SIGMA rule converter — pySigma + pySigma-backend-elasticsearch.

Usage:
    sigma_converter.py <filepath> <format> [--pipeline <pipeline>]

Supported formats:
    es-qs               Elasticsearch Lucene query string (default)
    dsl_lucene          Elasticsearch query DSL with embedded Lucene
    kibana / kibana_ndjson  Kibana NDJSON import
    siem_rule / elasticsearch-rule  Elasticsearch SIEM Rule JSON
    siem_rule_ndjson    Elasticsearch SIEM Rule NDJSON
    xpack-watcher / xpack-watcher-sp  Elasticsearch DSL (closest equivalent)
    eql                 Elastic Event Query Language
    esql                ES|QL
    elastalert          ElastAlert rule

Supported pipelines (--pipeline):
    ecs_windows         Windows ECS via Winlogbeat (default)
    ecs_windows_old     Windows ECS for Winlogbeat <= 6.x
    ecs_zeek_beats      Zeek via Elastic Beats
    ecs_zeek_corelight  Zeek via Corelight
    zeek_raw            Zeek raw JSON logs
    ecs_kubernetes      Kubernetes audit logs
    ecs_macos_esf       macOS Endpoint Security Framework
"""

import sys
import argparse
import importlib
import json
import logging

logging.basicConfig(level=logging.ERROR, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Maps the format arg (including legacy names) → (backend_type, pySigma_format)
FORMAT_MAP: dict[str, tuple[str, str]] = {
    "es-qs":               ("lucene", "default"),
    "default":             ("lucene", "default"),
    "dsl_lucene":          ("lucene", "dsl_lucene"),
    "kibana":              ("lucene", "kibana_ndjson"),
    "kibana_ndjson":       ("lucene", "kibana_ndjson"),
    "siem_rule":           ("lucene", "siem_rule"),
    "siem_rule_ndjson":    ("lucene", "siem_rule_ndjson"),
    "elasticsearch-rule":  ("lucene", "siem_rule"),
    # xpack-watcher has no direct pySigma equivalent; dsl_lucene is closest
    "xpack-watcher":       ("lucene", "dsl_lucene"),
    "xpack-watcher-sp":    ("lucene", "dsl_lucene"),
    "eql":                 ("eql",    "default"),
    "esql":                ("esql",   "default"),
    "elastalert":          ("elastalert", "default"),
}

# Maps pipeline name → (module_path, function_name)
PIPELINE_MAP: dict[str, tuple[str, str]] = {
    "ecs_windows":        ("sigma.pipelines.elasticsearch.windows",    "ecs_windows"),
    "ecs_windows_old":    ("sigma.pipelines.elasticsearch.windows",    "ecs_windows_old"),
    "ecs_linux":          ("sigma.pipelines.elasticsearch.linux",      "ecs_linux"),
    "ecs_zeek_beats":     ("sigma.pipelines.elasticsearch.zeek",       "ecs_zeek_beats"),
    "ecs_zeek_corelight": ("sigma.pipelines.elasticsearch.zeek",       "ecs_zeek_corelight"),
    "zeek_raw":           ("sigma.pipelines.elasticsearch.zeek",       "zeek_raw"),
    "ecs_kubernetes":     ("sigma.pipelines.elasticsearch.kubernetes",  "ecs_kubernetes"),
    "ecs_macos_esf":      ("sigma.pipelines.elasticsearch.macos",      "ecs_macos_esf"),
}


def load_pipeline(name: str):
    entry = PIPELINE_MAP.get(name)
    if not entry:
        print(f"Error: unknown pipeline '{name}'. Supported: {', '.join(PIPELINE_MAP)}", file=sys.stderr)
        sys.exit(1)
    module_path, func_name = entry
    try:
        module = importlib.import_module(module_path)
        return getattr(module, func_name)()
    except ImportError as e:
        print(f"Warning: could not import pipeline '{name}': {e} — using passthrough (no field mapping)", file=sys.stderr)
        from sigma.processing.pipeline import ProcessingPipeline
        return ProcessingPipeline()


def load_backend(backend_type: str, pipeline):
    try:
        from sigma.backends.elasticsearch import (
            LuceneBackend, EqlBackend, ESQLBackend, ElastalertBackend,
        )
    except ImportError as e:
        print(
            f"Error: pySigma elasticsearch backend not installed.\n"
            f"Install with: pip install pySigma-backend-elasticsearch\n{e}",
            file=sys.stderr,
        )
        sys.exit(1)

    backends = {
        "lucene":     LuceneBackend,
        "eql":        EqlBackend,
        "esql":       ESQLBackend,
        "elastalert": ElastalertBackend,
    }
    cls = backends.get(backend_type)
    if not cls:
        print(f"Error: unknown backend '{backend_type}'", file=sys.stderr)
        sys.exit(1)

    return cls(processing_pipeline=pipeline)


def convert(filepath: str, out_format: str, pipeline_name: str) -> None:
    try:
        from sigma.collection import SigmaCollection
    except ImportError as e:
        print(
            f"Error: pySigma not installed.\nInstall with: pip install pySigma\n{e}",
            file=sys.stderr,
        )
        sys.exit(1)

    if out_format not in FORMAT_MAP:
        print(
            f"Error: unsupported format '{out_format}'.\n"
            f"Supported: {', '.join(FORMAT_MAP)}",
            file=sys.stderr,
        )
        sys.exit(1)

    backend_type, sigma_format = FORMAT_MAP[out_format]
    pipeline = load_pipeline(pipeline_name)
    backend = load_backend(backend_type, pipeline)

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            collection = SigmaCollection.from_yaml(f)
    except FileNotFoundError:
        print(f"Error: file not found: {filepath}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error: could not parse SIGMA rule: {e}", file=sys.stderr)
        sys.exit(5)

    try:
        results = backend.convert(collection, output_format=sigma_format)
    except Exception as e:
        print(f"Error: conversion failed: {e}", file=sys.stderr)
        sys.exit(6)

    for result in results:
        if isinstance(result, (dict, list)):
            print(json.dumps(result, indent=2))
        else:
            print(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="SIGMA rule converter (pySigma)")
    parser.add_argument("filepath", help="Path to SIGMA rule YAML file")
    parser.add_argument(
        "format",
        help=(
            "Output format: es-qs, dsl_lucene, kibana, kibana_ndjson, siem_rule, "
            "siem_rule_ndjson, elasticsearch-rule, eql, esql, elastalert"
        ),
    )
    parser.add_argument(
        "--pipeline",
        default="ecs_windows",
        metavar="PIPELINE",
        help="Field-mapping pipeline (default: ecs_windows)",
    )
    args = parser.parse_args()
    convert(args.filepath, args.format, args.pipeline)


if __name__ == "__main__":
    main()