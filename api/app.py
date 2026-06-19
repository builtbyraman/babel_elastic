#!/usr/bin/env python3
"""
Babel API — REST service wrapping pySigma for the Babel Kibana plugin.

Endpoints
---------
GET  /health
POST /v1/conversions
POST /v1/rules/validate
POST /v1/coverage
POST /v1/coverage/navigator-export
POST /v1/ir-readiness
GET  /v1/fields[?category=<cat>]
POST /v1/fields/suggest
POST /v1/rules/quality
POST /v1/rules/register
POST /v1/test-runs
POST /v1/test-runs/<id>/cluster-hits
"""

import importlib
import json
import logging
import os
import re
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from functools import wraps

import requests
import yaml
from flask import Flask, jsonify, request

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)

ES_URL  = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
ES_USER = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
ES_PASS = os.getenv("ELASTICSEARCH_PASSWORD", "changeme")
API_KEY = os.getenv("API_KEY", "")

# ── Auth ──────────────────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if API_KEY:
            token = request.headers.get("Authorization", "")
            if token != f"Bearer {API_KEY}":
                return jsonify({"detail": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper


# ── pySigma helpers ───────────────────────────────────────────────────────────

FORMAT_MAP = {
    "lucene":            ("lucene",     "default"),
    "es-qs":             ("lucene",     "default"),
    "default":           ("lucene",     "default"),
    "dsl_lucene":        ("lucene",     "dsl_lucene"),
    "kibana":            ("lucene",     "kibana_ndjson"),
    "kibana_ndjson":     ("lucene",     "kibana_ndjson"),
    "siem_rule":         ("lucene",     "siem_rule"),
    "siem_rule_ndjson":  ("lucene",     "siem_rule_ndjson"),
    "elasticsearch-rule":("lucene",     "siem_rule"),
    "xpack-watcher":     ("lucene",     "dsl_lucene"),
    "eql":               ("eql",        "default"),
    "esql":              ("esql",       "default"),
    "elastalert":        ("elastalert", "default"),
}

PIPELINE_MAP = {
    "ecs_windows":        ("sigma.pipelines.elasticsearch.windows",    "ecs_windows"),
    "ecs_windows_old":    ("sigma.pipelines.elasticsearch.windows",    "ecs_windows_old"),
    "ecs_linux":          ("sigma.pipelines.elasticsearch.linux",      "ecs_linux"),
    "ecs_zeek_beats":     ("sigma.pipelines.elasticsearch.zeek",       "ecs_zeek_beats"),
    "ecs_zeek_corelight": ("sigma.pipelines.elasticsearch.zeek",       "ecs_zeek_corelight"),
    "zeek_raw":           ("sigma.pipelines.elasticsearch.zeek",       "zeek_raw"),
    "ecs_kubernetes":     ("sigma.pipelines.elasticsearch.kubernetes",  "ecs_kubernetes"),
    "ecs_macos_esf":      ("sigma.pipelines.elasticsearch.macos",      "ecs_macos_esf"),
}


def _load_pipeline(name: str):
    from sigma.processing.pipeline import ProcessingPipeline
    entry = PIPELINE_MAP.get(name)
    if not entry:
        return ProcessingPipeline()
    module_path, func_name = entry
    try:
        mod = importlib.import_module(module_path)
        return getattr(mod, func_name)()
    except (ImportError, AttributeError):
        return ProcessingPipeline()


def _load_backend(backend_type: str, pipeline):
    from sigma.backends.elasticsearch import (
        LuceneBackend, EqlBackend, ESQLBackend, ElastalertBackend,
    )
    return {
        "lucene":     LuceneBackend,
        "eql":        EqlBackend,
        "esql":       ESQLBackend,
        "elastalert": ElastalertBackend,
    }[backend_type](processing_pipeline=pipeline)


def _convert(rule_yaml: str, fmt: str, pipeline_name: str = "ecs_windows") -> str:
    from sigma.collection import SigmaCollection
    if fmt not in FORMAT_MAP:
        raise ValueError(f"Unsupported format '{fmt}'. Supported: {', '.join(FORMAT_MAP)}")
    backend_type, sigma_format = FORMAT_MAP[fmt]
    pipeline = _load_pipeline(pipeline_name)
    backend  = _load_backend(backend_type, pipeline)
    collection = SigmaCollection.from_yaml(rule_yaml)
    results = backend.convert(collection, output_format=sigma_format)
    if isinstance(results, list):
        result = results[0] if len(results) == 1 else results
    else:
        result = results
    return json.dumps(result, indent=2) if isinstance(result, (dict, list)) else str(result)


def _parse_tags(rule_yaml: str) -> tuple[list[str], list[str]]:
    """Return (tactic_slugs, technique_ids) from a rule's tags."""
    try:
        doc = yaml.safe_load(rule_yaml) or {}
    except Exception:
        return [], []
    tags = doc.get("tags") or []
    tactics, techniques = [], []
    for tag in tags:
        tag = str(tag).lower()
        if not tag.startswith("attack."):
            continue
        body = tag[7:]
        if re.match(r"^t\d{4}(\.\d{3})?$", body):
            techniques.append(body.upper())
        else:
            tactics.append(body)
    return tactics, techniques


# ── ATT&CK reference data ─────────────────────────────────────────────────────
# Technique → (name, primary tactic). Covers ~200 techniques commonly in SIGMA rules.

TECHNIQUE_INFO: dict[str, tuple[str, str]] = {
    "T1001": ("Data Obfuscation", "command-and-control"),
    "T1003": ("OS Credential Dumping", "credential-access"),
    "T1005": ("Data from Local System", "collection"),
    "T1007": ("System Service Discovery", "discovery"),
    "T1010": ("Application Window Discovery", "discovery"),
    "T1012": ("Query Registry", "discovery"),
    "T1016": ("System Network Configuration Discovery", "discovery"),
    "T1018": ("Remote System Discovery", "discovery"),
    "T1021": ("Remote Services", "lateral-movement"),
    "T1027": ("Obfuscated Files or Information", "defense-evasion"),
    "T1033": ("System Owner/User Discovery", "discovery"),
    "T1036": ("Masquerading", "defense-evasion"),
    "T1037": ("Boot or Logon Initialization Scripts", "persistence"),
    "T1040": ("Network Sniffing", "credential-access"),
    "T1041": ("Exfiltration Over C2 Channel", "exfiltration"),
    "T1046": ("Network Service Discovery", "discovery"),
    "T1047": ("Windows Management Instrumentation", "execution"),
    "T1048": ("Exfiltration Over Alternative Protocol", "exfiltration"),
    "T1049": ("System Network Connections Discovery", "discovery"),
    "T1053": ("Scheduled Task/Job", "execution"),
    "T1055": ("Process Injection", "defense-evasion"),
    "T1057": ("Process Discovery", "discovery"),
    "T1059": ("Command and Scripting Interpreter", "execution"),
    "T1059.001": ("PowerShell", "execution"),
    "T1059.003": ("Windows Command Shell", "execution"),
    "T1059.005": ("Visual Basic", "execution"),
    "T1059.006": ("Python", "execution"),
    "T1059.007": ("JavaScript", "execution"),
    "T1068": ("Exploitation for Privilege Escalation", "privilege-escalation"),
    "T1069": ("Permission Groups Discovery", "discovery"),
    "T1070": ("Indicator Removal", "defense-evasion"),
    "T1070.001": ("Clear Windows Event Logs", "defense-evasion"),
    "T1070.004": ("File Deletion", "defense-evasion"),
    "T1071": ("Application Layer Protocol", "command-and-control"),
    "T1071.001": ("Web Protocols", "command-and-control"),
    "T1072": ("Software Deployment Tools", "execution"),
    "T1074": ("Data Staged", "collection"),
    "T1078": ("Valid Accounts", "defense-evasion"),
    "T1080": ("Taint Shared Content", "lateral-movement"),
    "T1082": ("System Information Discovery", "discovery"),
    "T1083": ("File and Directory Discovery", "discovery"),
    "T1087": ("Account Discovery", "discovery"),
    "T1090": ("Proxy", "command-and-control"),
    "T1091": ("Replication Through Removable Media", "lateral-movement"),
    "T1095": ("Non-Application Layer Protocol", "command-and-control"),
    "T1098": ("Account Manipulation", "persistence"),
    "T1102": ("Web Service", "command-and-control"),
    "T1105": ("Ingress Tool Transfer", "command-and-control"),
    "T1106": ("Native API", "execution"),
    "T1110": ("Brute Force", "credential-access"),
    "T1112": ("Modify Registry", "defense-evasion"),
    "T1113": ("Screen Capture", "collection"),
    "T1119": ("Automated Collection", "collection"),
    "T1120": ("Peripheral Device Discovery", "discovery"),
    "T1123": ("Audio Capture", "collection"),
    "T1124": ("System Time Discovery", "discovery"),
    "T1125": ("Video Capture", "collection"),
    "T1127": ("Trusted Developer Utilities Proxy Execution", "defense-evasion"),
    "T1129": ("Shared Modules", "execution"),
    "T1132": ("Data Encoding", "command-and-control"),
    "T1133": ("External Remote Services", "persistence"),
    "T1134": ("Access Token Manipulation", "privilege-escalation"),
    "T1135": ("Network Share Discovery", "discovery"),
    "T1136": ("Create Account", "persistence"),
    "T1140": ("Deobfuscate/Decode Files or Information", "defense-evasion"),
    "T1190": ("Exploit Public-Facing Application", "initial-access"),
    "T1195": ("Supply Chain Compromise", "initial-access"),
    "T1197": ("BITS Jobs", "defense-evasion"),
    "T1199": ("Trusted Relationship", "initial-access"),
    "T1200": ("Hardware Additions", "initial-access"),
    "T1201": ("Password Policy Discovery", "discovery"),
    "T1202": ("Indirect Command Execution", "defense-evasion"),
    "T1203": ("Exploitation for Client Execution", "execution"),
    "T1204": ("User Execution", "execution"),
    "T1204.001": ("Malicious Link", "execution"),
    "T1204.002": ("Malicious File", "execution"),
    "T1210": ("Exploitation of Remote Services", "lateral-movement"),
    "T1211": ("Exploitation for Defense Evasion", "defense-evasion"),
    "T1212": ("Exploitation for Credential Access", "credential-access"),
    "T1213": ("Data from Information Repositories", "collection"),
    "T1218": ("System Binary Proxy Execution", "defense-evasion"),
    "T1218.001": ("Compiled HTML File", "defense-evasion"),
    "T1218.003": ("CMSTP", "defense-evasion"),
    "T1218.005": ("Mshta", "defense-evasion"),
    "T1218.007": ("Msiexec", "defense-evasion"),
    "T1218.010": ("Regsvr32", "defense-evasion"),
    "T1218.011": ("Rundll32", "defense-evasion"),
    "T1219": ("Remote Access Software", "command-and-control"),
    "T1220": ("XSL Script Processing", "defense-evasion"),
    "T1222": ("File and Directory Permissions Modification", "defense-evasion"),
    "T1484": ("Domain Policy Modification", "defense-evasion"),
    "T1485": ("Data Destruction", "impact"),
    "T1486": ("Data Encrypted for Impact", "impact"),
    "T1489": ("Service Stop", "impact"),
    "T1490": ("Inhibit System Recovery", "impact"),
    "T1491": ("Defacement", "impact"),
    "T1496": ("Resource Hijacking", "impact"),
    "T1497": ("Virtualization/Sandbox Evasion", "defense-evasion"),
    "T1499": ("Endpoint Denial of Service", "impact"),
    "T1505": ("Server Software Component", "persistence"),
    "T1518": ("Software Discovery", "discovery"),
    "T1525": ("Implant Internal Image", "persistence"),
    "T1526": ("Cloud Service Discovery", "discovery"),
    "T1528": ("Steal Application Access Token", "credential-access"),
    "T1529": ("System Shutdown/Reboot", "impact"),
    "T1530": ("Data from Cloud Storage", "collection"),
    "T1531": ("Account Access Removal", "impact"),
    "T1539": ("Steal Web Session Cookie", "credential-access"),
    "T1543": ("Create or Modify System Process", "persistence"),
    "T1546": ("Event Triggered Execution", "privilege-escalation"),
    "T1547": ("Boot or Logon Autostart Execution", "persistence"),
    "T1547.001": ("Registry Run Keys / Startup Folder", "persistence"),
    "T1548": ("Abuse Elevation Control Mechanism", "privilege-escalation"),
    "T1548.002": ("Bypass User Account Control", "privilege-escalation"),
    "T1550": ("Use Alternate Authentication Material", "lateral-movement"),
    "T1552": ("Unsecured Credentials", "credential-access"),
    "T1553": ("Subvert Trust Controls", "defense-evasion"),
    "T1555": ("Credentials from Password Stores", "credential-access"),
    "T1556": ("Modify Authentication Process", "credential-access"),
    "T1557": ("Adversary-in-the-Middle", "credential-access"),
    "T1558": ("Steal or Forge Kerberos Tickets", "credential-access"),
    "T1560": ("Archive Collected Data", "collection"),
    "T1562": ("Impair Defenses", "defense-evasion"),
    "T1562.001": ("Disable or Modify Tools", "defense-evasion"),
    "T1563": ("Remote Service Session Hijacking", "lateral-movement"),
    "T1564": ("Hide Artifacts", "defense-evasion"),
    "T1566": ("Phishing", "initial-access"),
    "T1566.001": ("Spearphishing Attachment", "initial-access"),
    "T1566.002": ("Spearphishing Link", "initial-access"),
    "T1567": ("Exfiltration Over Web Service", "exfiltration"),
    "T1569": ("System Services", "execution"),
    "T1570": ("Lateral Tool Transfer", "lateral-movement"),
    "T1571": ("Non-Standard Port", "command-and-control"),
    "T1572": ("Protocol Tunneling", "command-and-control"),
    "T1574": ("Hijack Execution Flow", "persistence"),
    "T1578": ("Modify Cloud Compute Infrastructure", "defense-evasion"),
    "T1580": ("Cloud Infrastructure Discovery", "discovery"),
    "T1583": ("Acquire Infrastructure", "resource-development"),
    "T1584": ("Compromise Infrastructure", "resource-development"),
    "T1585": ("Establish Accounts", "resource-development"),
    "T1586": ("Compromise Accounts", "resource-development"),
    "T1589": ("Gather Victim Identity Information", "reconnaissance"),
    "T1590": ("Gather Victim Network Information", "reconnaissance"),
    "T1591": ("Gather Victim Org Information", "reconnaissance"),
    "T1592": ("Gather Victim Host Information", "reconnaissance"),
    "T1593": ("Search Open Websites/Domains", "reconnaissance"),
    "T1594": ("Search Victim-Owned Websites", "reconnaissance"),
    "T1595": ("Active Scanning", "reconnaissance"),
    "T1596": ("Search Open Technical Databases", "reconnaissance"),
    "T1597": ("Search Closed Sources", "reconnaissance"),
    "T1598": ("Phishing for Information", "reconnaissance"),
    "T1599": ("Network Boundary Bridging", "defense-evasion"),
    "T1600": ("Weaken Encryption", "defense-evasion"),
    "T1601": ("Modify System Image", "defense-evasion"),
    "T1602": ("Data from Configuration Repository", "collection"),
    "T1606": ("Forge Web Credentials", "credential-access"),
    "T1608": ("Stage Capabilities", "resource-development"),
    "T1609": ("Container Administration Command", "execution"),
    "T1610": ("Deploy Container", "defense-evasion"),
    "T1611": ("Escape to Host", "privilege-escalation"),
    "T1612": ("Build Image on Host", "defense-evasion"),
    "T1613": ("Container and Resource Discovery", "discovery"),
    "T1614": ("System Location Discovery", "discovery"),
    "T1615": ("Group Policy Discovery", "discovery"),
    "T1619": ("Cloud Storage Object Discovery", "discovery"),
    "T1620": ("Reflective Code Loading", "defense-evasion"),
    "T1621": ("Multi-Factor Authentication Request Generation", "credential-access"),
    "T1622": ("Debugger Evasion", "defense-evasion"),
    "T1649": ("Steal or Forge Authentication Certificates", "credential-access"),
    "T1651": ("Cloud Administration Command", "execution"),
    "T1652": ("Device Driver Discovery", "discovery"),
    "T1653": ("Power Settings", "persistence"),
    "T1654": ("Log Enumeration", "discovery"),
    "T1656": ("Impersonation", "defense-evasion"),
    "T1657": ("Financial Theft", "impact"),
    "T1659": ("Content Injection", "command-and-control"),
}

TACTIC_ORDER = [
    "reconnaissance", "resource-development", "initial-access", "execution",
    "persistence", "privilege-escalation", "defense-evasion", "credential-access",
    "discovery", "lateral-movement", "collection", "command-and-control",
    "exfiltration", "impact",
]

TACTIC_DISPLAY = {
    "reconnaissance": "Reconnaissance",
    "resource-development": "Resource Development",
    "initial-access": "Initial Access",
    "execution": "Execution",
    "persistence": "Persistence",
    "privilege-escalation": "Privilege Escalation",
    "defense-evasion": "Defense Evasion",
    "credential-access": "Credential Access",
    "discovery": "Discovery",
    "lateral-movement": "Lateral Movement",
    "collection": "Collection",
    "command-and-control": "Command and Control",
    "exfiltration": "Exfiltration",
    "impact": "Impact",
}

# IR readiness: scenario → required technique IDs
IR_SCENARIOS: dict[str, dict] = {
    "ransomware": {
        "display": "Ransomware",
        "phases": {
            "initial-access":     ["T1566", "T1190", "T1133", "T1078"],
            "execution":          ["T1059", "T1204", "T1047"],
            "persistence":        ["T1547", "T1053", "T1543"],
            "privilege-escalation": ["T1548", "T1134"],
            "defense-evasion":    ["T1070", "T1562", "T1027"],
            "credential-access":  ["T1003", "T1110"],
            "lateral-movement":   ["T1021", "T1570"],
            "impact":             ["T1486", "T1490", "T1489"],
        },
    },
    "apt": {
        "display": "APT / Nation-State",
        "phases": {
            "reconnaissance":     ["T1595", "T1589", "T1590"],
            "initial-access":     ["T1566", "T1190", "T1199"],
            "execution":          ["T1059", "T1203", "T1106"],
            "persistence":        ["T1547", "T1505", "T1053"],
            "defense-evasion":    ["T1027", "T1055", "T1070"],
            "credential-access":  ["T1003", "T1558", "T1552"],
            "lateral-movement":   ["T1021", "T1550"],
            "collection":         ["T1005", "T1074", "T1213"],
            "exfiltration":       ["T1041", "T1048", "T1567"],
        },
    },
    "insider_threat": {
        "display": "Insider Threat",
        "phases": {
            "collection":         ["T1005", "T1074", "T1113", "T1213"],
            "exfiltration":       ["T1041", "T1048", "T1052", "T1567"],
            "defense-evasion":    ["T1070", "T1564", "T1027"],
            "credential-access":  ["T1003", "T1552", "T1539"],
            "discovery":          ["T1083", "T1087", "T1135"],
        },
    },
    "data_breach": {
        "display": "Data Breach",
        "phases": {
            "initial-access":     ["T1190", "T1566", "T1078"],
            "credential-access":  ["T1110", "T1003", "T1557"],
            "discovery":          ["T1083", "T1087", "T1135"],
            "collection":         ["T1005", "T1530", "T1213"],
            "exfiltration":       ["T1041", "T1048", "T1567"],
        },
    },
    "supply_chain": {
        "display": "Supply Chain Attack",
        "phases": {
            "initial-access":     ["T1195", "T1199"],
            "execution":          ["T1072", "T1059"],
            "persistence":        ["T1547", "T1525"],
            "defense-evasion":    ["T1036", "T1553", "T1027"],
            "credential-access":  ["T1003", "T1552"],
            "lateral-movement":   ["T1021", "T1570"],
        },
    },
}

# ── ECS field catalog ─────────────────────────────────────────────────────────

ECS_FIELDS: dict[str, list[dict]] = {
    "process_creation": [
        {"field": "process.name",                  "type": "keyword", "description": "Process name"},
        {"field": "process.executable",            "type": "keyword", "description": "Full path to process executable"},
        {"field": "process.command_line",          "type": "wildcard", "description": "Full command line"},
        {"field": "process.args",                  "type": "keyword", "description": "Process arguments array"},
        {"field": "process.pid",                   "type": "long",    "description": "Process ID"},
        {"field": "process.parent.name",           "type": "keyword", "description": "Parent process name"},
        {"field": "process.parent.executable",     "type": "keyword", "description": "Parent process executable"},
        {"field": "process.parent.command_line",   "type": "wildcard", "description": "Parent command line"},
        {"field": "process.parent.pid",            "type": "long",    "description": "Parent process ID"},
        {"field": "process.pe.original_file_name", "type": "keyword", "description": "Original filename from PE header"},
        {"field": "process.hash.md5",              "type": "keyword", "description": "MD5 hash of process"},
        {"field": "process.hash.sha256",           "type": "keyword", "description": "SHA-256 hash of process"},
        {"field": "user.name",                     "type": "keyword", "description": "Username"},
        {"field": "host.name",                     "type": "keyword", "description": "Hostname"},
        {"field": "event.type",                    "type": "keyword", "description": "Event type (start, end)"},
    ],
    "network_connection": [
        {"field": "source.ip",        "type": "ip",      "description": "Source IP address"},
        {"field": "source.port",      "type": "long",    "description": "Source port"},
        {"field": "destination.ip",   "type": "ip",      "description": "Destination IP address"},
        {"field": "destination.port", "type": "long",    "description": "Destination port"},
        {"field": "network.protocol", "type": "keyword", "description": "Network protocol"},
        {"field": "network.direction","type": "keyword", "description": "Network direction"},
        {"field": "process.name",     "type": "keyword", "description": "Process making the connection"},
        {"field": "user.name",        "type": "keyword", "description": "Username"},
    ],
    "dns_query": [
        {"field": "dns.question.name",  "type": "keyword", "description": "DNS query name"},
        {"field": "dns.question.type",  "type": "keyword", "description": "DNS record type"},
        {"field": "dns.answers.data",   "type": "keyword", "description": "DNS response data"},
        {"field": "source.ip",          "type": "ip",      "description": "Source IP"},
        {"field": "process.name",       "type": "keyword", "description": "Process making the query"},
    ],
    "file_event": [
        {"field": "file.path",       "type": "keyword", "description": "Full file path"},
        {"field": "file.name",       "type": "keyword", "description": "File name"},
        {"field": "file.extension",  "type": "keyword", "description": "File extension"},
        {"field": "file.hash.md5",   "type": "keyword", "description": "MD5 hash"},
        {"field": "file.hash.sha256","type": "keyword", "description": "SHA-256 hash"},
        {"field": "process.name",    "type": "keyword", "description": "Process performing the operation"},
        {"field": "user.name",       "type": "keyword", "description": "Username"},
        {"field": "event.action",    "type": "keyword", "description": "File action (creation, deletion, modification)"},
    ],
    "registry_event": [
        {"field": "registry.path",          "type": "keyword", "description": "Full registry path"},
        {"field": "registry.key",           "type": "keyword", "description": "Registry key"},
        {"field": "registry.value",         "type": "keyword", "description": "Registry value name"},
        {"field": "registry.data.strings",  "type": "wildcard","description": "Registry value data"},
        {"field": "process.name",           "type": "keyword", "description": "Process modifying registry"},
        {"field": "event.action",           "type": "keyword", "description": "Registry action"},
    ],
    "webserver": [
        {"field": "url.path",              "type": "wildcard","description": "URL path"},
        {"field": "url.query",             "type": "keyword", "description": "URL query string"},
        {"field": "http.request.method",   "type": "keyword", "description": "HTTP method"},
        {"field": "http.response.status_code","type":"long",  "description": "HTTP status code"},
        {"field": "source.ip",             "type": "ip",      "description": "Client IP"},
        {"field": "user_agent.original",   "type": "wildcard","description": "User agent string"},
    ],
}

# SIGMA field name → ECS field suggestions
SIGMA_TO_ECS: dict[str, list[str]] = {
    "CommandLine":         ["process.command_line", "process.args"],
    "Image":               ["process.executable", "process.name"],
    "OriginalFileName":    ["process.pe.original_file_name"],
    "ParentImage":         ["process.parent.executable", "process.parent.name"],
    "ParentCommandLine":   ["process.parent.command_line"],
    "ParentProcessId":     ["process.parent.pid"],
    "ProcessId":           ["process.pid"],
    "User":                ["user.name", "user.id"],
    "SubjectUserName":     ["user.name"],
    "TargetUserName":      ["user.target.name"],
    "Hostname":            ["host.name", "host.hostname"],
    "ComputerName":        ["host.name"],
    "DestinationIp":       ["destination.ip"],
    "DestinationPort":     ["destination.port"],
    "SourceIp":            ["source.ip"],
    "SourcePort":          ["source.port"],
    "dst_ip":              ["destination.ip"],
    "dst_port":            ["destination.port"],
    "src_ip":              ["source.ip"],
    "src_port":            ["source.port"],
    "EventID":             ["event.code", "winlog.event_id"],
    "Channel":             ["winlog.channel"],
    "Provider_Name":       ["winlog.provider_name"],
    "TargetFilename":      ["file.path", "file.name"],
    "TargetObject":        ["registry.path", "registry.key"],
    "Details":             ["registry.data.strings"],
    "sha256":              ["file.hash.sha256", "process.hash.sha256"],
    "md5":                 ["file.hash.md5", "process.hash.md5"],
    "sha1":                ["file.hash.sha1"],
    "Imphash":             ["process.pe.imphash"],
    "QueryName":           ["dns.question.name"],
    "QueryResults":        ["dns.answers.data"],
    "QueryType":           ["dns.question.type"],
    "cs-uri-stem":         ["url.path"],
    "cs-uri-query":        ["url.query"],
    "c-ip":                ["source.ip"],
    "cs-method":           ["http.request.method"],
    "sc-status":           ["http.response.status_code"],
    "cs(User-Agent)":      ["user_agent.original"],
    "ScriptBlockText":     ["powershell.file.script_block_text", "process.command_line"],
    "Payload":             ["message"],
}

# ── In-memory test-run store ──────────────────────────────────────────────────
# Maps test_run_id → {status, query, hits, error}
_test_runs: dict[str, dict] = {}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "sigma-api"})


@app.post("/v1/conversions")
@require_auth
def conversions():
    body = request.get_json(force=True) or {}
    rule_yaml    = body.get("rule_yaml", "")
    fmt          = body.get("format", "lucene")
    pipeline     = body.get("pipeline", "ecs_windows")

    if not rule_yaml:
        return jsonify({"detail": "rule_yaml is required"}), 400
    try:
        result = _convert(rule_yaml, fmt, pipeline)
        return jsonify({"query_result": result})
    except ValueError as e:
        return jsonify({"detail": str(e)}), 400
    except Exception as e:
        log.exception("Conversion failed")
        return jsonify({"detail": f"Conversion failed: {e}"}), 500


@app.post("/v1/rules/validate")
@require_auth
def validate_rule():
    body = request.get_json(force=True) or {}
    rule_yaml = body.get("rule_yaml", "")
    if not rule_yaml:
        return jsonify({"detail": "rule_yaml is required"}), 400
    try:
        from sigma.collection import SigmaCollection
        from sigma.exceptions import SigmaError
        errors, warnings = [], []
        try:
            collection = SigmaCollection.from_yaml(rule_yaml)
            for rule in collection:
                for err in (rule.errors or []):
                    errors.append(str(err))
                for warn in getattr(rule, "warnings", []) or []:
                    warnings.append(str(warn))
        except SigmaError as e:
            errors.append(str(e))
        except Exception as e:
            errors.append(f"Parse error: {e}")
        issues = [{"type": "error", "message": e} for e in errors] + [{"type": "warning", "message": w} for w in warnings]
        return jsonify({"valid": len(errors) == 0, "errors": errors, "warnings": warnings, "issues": issues})
    except Exception as e:
        log.exception("Validation failed")
        return jsonify({"detail": f"Validation error: {e}"}), 500


@app.post("/v1/coverage")
@require_auth
def coverage():
    body = request.get_json(force=True) or {}
    rule_yamls = body.get("rule_yamls", [])

    techniques_map: dict[str, dict] = {}
    for rule_yaml in rule_yamls:
        try:
            doc = yaml.safe_load(rule_yaml) or {}
        except Exception:
            continue
        title = doc.get("title", "Untitled")
        _, techs = _parse_tags(rule_yaml)
        for tid in techs:
            if tid not in techniques_map:
                name, tactic = TECHNIQUE_INFO.get(tid, (tid, "unknown"))
                techniques_map[tid] = {
                    "technique_id": tid,
                    "technique_name": name,
                    "tactic": tactic,
                    "rule_count": 0,
                    "rules": [],
                }
            techniques_map[tid]["rule_count"] += 1
            techniques_map[tid]["rules"].append(title)

    techniques_out = sorted(
        [
            {
                "id": t["technique_id"],
                "name": t["technique_name"],
                "tactic": t["tactic"],
                "tactic_display": TACTIC_DISPLAY.get(t["tactic"], t["tactic"]),
                "rules": t["rules"],
            }
            for t in techniques_map.values()
        ],
        key=lambda t: t["id"],
    )

    covered_tactic_set = {t["tactic"] for t in techniques_out}
    covered_tactics = [tac for tac in TACTIC_ORDER if tac in covered_tactic_set]
    uncovered_tactics = [tac for tac in TACTIC_ORDER if tac not in covered_tactic_set]

    by_tactic: dict[str, list] = {tac: [] for tac in TACTIC_ORDER}
    rule_index: dict[str, list] = {}
    for t in techniques_out:
        tac = t["tactic"]
        if tac not in by_tactic:
            by_tactic[tac] = []
        by_tactic[tac].append(t["id"])
        rule_index[t["id"]] = t["rules"]

    return jsonify({
        "total_rules": len(rule_yamls),
        "parsed_rules": len(rule_yamls),
        "covered_techniques": len(techniques_out),
        "covered_tactics": covered_tactics,
        "uncovered_tactics": uncovered_tactics,
        "techniques": techniques_out,
        "by_tactic": by_tactic,
        "rule_index": rule_index,
    })


@app.post("/v1/coverage/navigator-export")
@require_auth
def coverage_navigator_export():
    body = request.get_json(force=True) or {}
    rule_yamls = body.get("rule_yamls", [])

    scores: dict[str, int] = defaultdict(int)
    for rule_yaml in rule_yamls:
        _, techs = _parse_tags(rule_yaml)
        for tid in techs:
            scores[tid] += 1

    layer = {
        "name": "Babel Rule Coverage",
        "versions": {"attack": "14", "navigator": "4.9.1", "layer": "4.5"},
        "domain": "enterprise-attack",
        "description": f"Generated by Babel — {len(rule_yamls)} rules analyzed",
        "filters": {"platforms": ["Windows", "Linux", "macOS"]},
        "sorting": 3,
        "layout": {"layout": "side", "showID": True, "showName": True},
        "hideDisabled": False,
        "techniques": [
            {
                "techniqueID": tid,
                "score": count,
                "color": _score_color(count),
                "comment": f"{count} rule{'s' if count != 1 else ''}",
                "enabled": True,
            }
            for tid, count in scores.items()
        ],
        "gradient": {
            "colors": ["#ffffcc", "#41b6c4", "#253494"],
            "minValue": 0,
            "maxValue": max(scores.values()) if scores else 1,
        },
        "legendItems": [],
        "metadata": [],
    }
    return jsonify(layer)


def _score_color(score: int) -> str:
    if score >= 5:
        return "#253494"
    if score >= 3:
        return "#41b6c4"
    if score >= 1:
        return "#a1dab4"
    return ""


@app.post("/v1/ir-readiness")
@require_auth
def ir_readiness():
    body = request.get_json(force=True) or {}
    scenario   = body.get("scenario", "ransomware")
    rule_yamls = body.get("rule_yamls", [])

    scenario_def = IR_SCENARIOS.get(scenario, IR_SCENARIOS["ransomware"])

    # Build per-rule coverage map
    rule_tech_map: dict[str, set[str]] = {}
    all_covered: set[str] = set()
    for rule_yaml in rule_yamls:
        try:
            doc = yaml.safe_load(rule_yaml) or {}
        except Exception:
            doc = {}
        title = str(doc.get("title", "Untitled"))
        _, techs = _parse_tags(rule_yaml)
        expanded: set[str] = set(techs)
        for t in techs:
            if "." in t:
                expanded.add(t.split(".")[0])
        rule_tech_map[title] = expanded
        all_covered.update(expanded)

    phases_out = []
    total_expected = 0
    total_covered_count = 0
    for tactic, required_ids in scenario_def["phases"].items():
        covered_here = [t for t in required_ids if t in all_covered]
        missing_here = [t for t in required_ids if t not in all_covered]
        pct = round(len(covered_here) / len(required_ids) * 100) if required_ids else 0
        covering_rules = [r for r, techs in rule_tech_map.items() if any(t in techs for t in required_ids)]
        total_expected += len(required_ids)
        total_covered_count += len(covered_here)
        phases_out.append({
            "phase": tactic,
            "description": TACTIC_DISPLAY.get(tactic, tactic),
            "notes": "",
            "expected_techniques": required_ids,
            "covered_techniques": covered_here,
            "missing_techniques": missing_here,
            "technique_coverage_pct": pct,
            "has_technique_coverage": len(covered_here) > 0,
            "covering_rules": covering_rules,
            "tagged_rules": covering_rules,
            "has_tagged_rules": len(covering_rules) > 0,
            "rule_count": len(covering_rules),
        })

    phases_covered = sum(1 for p in phases_out if p["has_technique_coverage"])
    overall = round(total_covered_count / total_expected * 100) if total_expected else 0

    return jsonify({
        "scenario": scenario,
        "scenario_display": scenario_def["display"],
        "scenario_description": scenario_def["display"],
        "total_rules_analyzed": len(rule_yamls),
        "phases": phases_out,
        "phases_covered": phases_covered,
        "phases_total": len(phases_out),
        "overall_technique_coverage_pct": overall,
        "total_expected_techniques": total_expected,
        "total_covered_techniques": total_covered_count,
    })


@app.get("/v1/fields")
@require_auth
def fields():
    category = request.args.get("category")
    if category and category in ECS_FIELDS:
        return jsonify({"category": category, "fields": ECS_FIELDS[category]})
    all_fields = []
    seen = set()
    for cat_fields in ECS_FIELDS.values():
        for f in cat_fields:
            if f["field"] not in seen:
                seen.add(f["field"])
                all_fields.append(f)
    all_fields.sort(key=lambda f: f["field"])
    return jsonify({
        "categories": list(ECS_FIELDS.keys()),
        "fields": all_fields,
    })


@app.post("/v1/fields/suggest")
@require_auth
def fields_suggest():
    body = request.get_json(force=True) or {}
    sigma_field = body.get("sigma_field", "")
    suggestions = SIGMA_TO_ECS.get(sigma_field, [])
    # Fuzzy fallback: case-insensitive prefix match
    if not suggestions:
        lower = sigma_field.lower()
        for key, vals in SIGMA_TO_ECS.items():
            if key.lower().startswith(lower) or lower.startswith(key.lower()):
                suggestions = vals
                break
    return jsonify({"sigma_field": sigma_field, "suggestions": suggestions})


@app.post("/v1/rules/quality")
@require_auth
def rules_quality():
    body = request.get_json(force=True) or {}
    rule_yaml = body.get("rule_yaml", "")
    if not rule_yaml:
        return jsonify({"detail": "rule_yaml is required"}), 400
    try:
        doc = yaml.safe_load(rule_yaml) or {}
    except Exception as e:
        return jsonify({"detail": f"YAML parse error: {e}"}), 400

    scores = {}
    scores["title"]       = 10 if doc.get("title") else 0
    scores["description"] = 20 if doc.get("description") else 0
    scores["references"]  = 15 if doc.get("references") else 0
    scores["tags"]        = 15 if doc.get("tags") else 0
    scores["status"]      = 10 if doc.get("status") else 0
    scores["level"]       = 10 if doc.get("level") else 0
    scores["date"]        = 10 if doc.get("date") else 0
    scores["author"]      = 10 if doc.get("author") else 0
    total = sum(scores.values())

    issues = []
    if not doc.get("description"):
        issues.append("Missing description — add context about what this rule detects")
    if not doc.get("references"):
        issues.append("No references — link to threat intelligence or research")
    if not doc.get("tags"):
        issues.append("No ATT&CK tags — add attack.* tags for coverage mapping")
    if doc.get("status") == "experimental":
        issues.append("Status is 'experimental' — validate before production deployment")
    if not doc.get("level"):
        issues.append("No severity level — set level: low/medium/high/critical")

    return jsonify({
        "rule_title": str(doc.get("title", "")),
        "score": total,
        "max_score": 100,
        "grade": "A" if total >= 90 else "B" if total >= 75 else "C" if total >= 60 else "D",
        "breakdown": scores,
        "issues": issues,
        "reasons": issues,
    })


@app.post("/v1/rules/register")
@require_auth
def rules_register():
    # Lightweight registration — store is in the plugin's Elasticsearch index
    return jsonify({"registered": True})


@app.post("/v1/test-runs")
@require_auth
def test_runs():
    import time
    body = request.get_json(force=True) or {}
    rule_yaml       = body.get("rule_yaml", "")
    index_pattern   = body.get("index_pattern", "*")
    timeframe_hours = int(body.get("timeframe_hours", 24))
    pipeline        = body.get("pipeline", "ecs_windows")
    query_format    = body.get("query_format", "lucene")

    if not rule_yaml:
        return jsonify({"detail": "rule_yaml is required"}), 400

    run_id = str(uuid.uuid4())
    _test_runs[run_id] = {"status": "running", "hits": [], "error": None}

    try:
        query_str = _convert(rule_yaml, query_format, pipeline)
    except Exception as e:
        _test_runs[run_id] = {"status": "error", "hits": [], "error": str(e)}
        return jsonify({"detail": f"Conversion failed: {e}"}), 400

    now = datetime.now(timezone.utc)
    gte = (now - timedelta(hours=timeframe_hours)).isoformat()
    t0 = time.time()

    if query_format == "eql":
        es_query = {
            "query": query_str,
            "filter": {"range": {"@timestamp": {"gte": gte}}},
        }
        es_path = f"/{index_pattern}/_eql/search"
    else:
        es_query = {
            "query": {
                "bool": {
                    "must": [{"query_string": {"query": query_str, "analyze_wildcard": True}}],
                    "filter": [{"range": {"@timestamp": {"gte": gte}}}],
                }
            },
            "size": 100,
            "_source": True,
        }
        es_path = f"/{index_pattern}/_search"

    try:
        resp = requests.post(
            f"{ES_URL}{es_path}",
            auth=(ES_USER, ES_PASS),
            json=es_query,
            timeout=30,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        timing_ms = round((time.time() - t0) * 1000)
        hits = data.get("hits", {}).get("hits", [])
        total = data.get("hits", {}).get("total", {})
        total_count = total.get("value", len(hits)) if isinstance(total, dict) else total

        _test_runs[run_id] = {
            "status": "complete",
            "hits": hits[:50],
            "total": total_count,
            "query": query_str,
            "error": None,
        }
        return jsonify({
            "test_run_id": run_id,
            "hit_count": total_count,
            "sample_events": [
                {
                    "event_id": h.get("_id", ""),
                    "timestamp": h.get("_source", {}).get("@timestamp", ""),
                    "source": h.get("_source", {}),
                }
                for h in hits[:10]
            ],
            "timing_ms": timing_ms,
        })
    except requests.HTTPError as e:
        err = f"Elasticsearch error: {e.response.status_code} {e.response.text[:200]}"
        _test_runs[run_id] = {"status": "error", "hits": [], "error": err}
        return jsonify({"detail": err}), 502
    except Exception as e:
        err = str(e)
        _test_runs[run_id] = {"status": "error", "hits": [], "error": err}
        return jsonify({"detail": err}), 500


@app.post("/v1/test-runs/<run_id>/cluster-hits")
@require_auth
def cluster_hits(run_id: str):
    body = request.get_json(force=True) or {}
    top_n = int(body.get("top_n", 5))

    run = _test_runs.get(run_id)
    if not run:
        return jsonify({"detail": "Test run not found"}), 404
    if run["status"] == "running":
        return jsonify({"detail": "Test run still in progress"}), 202

    hits = run.get("hits", [])

    # Aggregate top values per field across all hits
    CLUSTER_FIELDS = [
        "process.name", "source.ip", "host.name", "user.name",
        "destination.ip", "event.action", "file.name",
    ]
    field_counts: dict[str, dict[str, int]] = {}
    for hit in hits:
        src = hit.get("_source", {})
        for field in CLUSTER_FIELDS:
            val: object = src
            for part in field.split("."):
                val = val.get(part) if isinstance(val, dict) else None
            if val is not None:
                val_str = str(val)
                if field not in field_counts:
                    field_counts[field] = {}
                field_counts[field][val_str] = field_counts[field].get(val_str, 0) + 1

    clusters = [
        {
            "field": field,
            "buckets": sorted(
                [{"value": v, "count": c} for v, c in bkts.items()],
                key=lambda x: x["count"],
                reverse=True,
            )[:top_n],
        }
        for field, bkts in field_counts.items()
        if bkts
    ]
    clusters.sort(
        key=lambda c: c["buckets"][0]["count"] if c["buckets"] else 0,
        reverse=True,
    )

    return jsonify({
        "test_run_id": run_id,
        "total_hits": len(hits),
        "clusters": clusters[:top_n],
    })


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    log.info("Starting Sigma API on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
