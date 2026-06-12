# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x (current) | Yes |
| 1.x | No — upgrade to 2.x |

Only the latest release receives security fixes. Pre-release and development builds are not supported.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email the maintainer at **araman05@gmail.com** with:

- A clear description of the vulnerability
- Steps to reproduce (including curl commands or sample payloads where relevant)
- Affected component and version
- Potential impact and any suggested mitigations

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days** of confirmation. Fixes are released as point releases and announced in the GitHub releases feed.

---

## Security Architecture

Understanding how Babel handles authorization is important for threat modelling your deployment.

### Authentication

All plugin API routes require a valid **Kibana session** (cookie or API key). Unauthenticated requests are rejected by Kibana's core auth middleware before they reach the plugin. The `authz: { enabled: false }` flag in route definitions disables Kibana's *role-based authorization* layer — not authentication.

### Authorization model

Babel uses two different authz strategies depending on the route:

**Detection rule deployment** (`POST /api/babel/deploy`)  
The plugin forwards the caller's Kibana session credentials to the Kibana Detection Engine API, which enforces its own RBAC. A user without the Security → Detections `All` privilege will receive HTTP 403 from the Detection Engine. No privilege escalation is possible through this route.

**Plugin settings and sync** (`POST /api/babel/repos`, `POST /api/babel/sync`, `POST /api/babel/set-github-token`)  
These routes write to the `babel_config` Elasticsearch index using the caller's credentials (`asCurrentUser`). Access control depends on Elasticsearch index-level permissions for `babel_config`. In typical Kibana deployments, low-privilege roles do not have write access to arbitrary indices, so this implicit guard usually holds — but it is not explicitly auditable in the plugin itself.

**Practical implication:** Any authenticated Kibana user whose ES credentials include write access to `babel_config` can modify plugin settings, register GitHub repos, and trigger syncs. Restrict this with the mitigations below.

---

## Known Security Considerations

### 1. Plugin settings are not role-gated

There is no per-feature RBAC within the plugin. Any authenticated Kibana user who can write to `babel_config` via ES can:

- Register or remove GitHub repositories
- Set or overwrite the stored GitHub PAT
- Trigger bulk SIGMA rule syncs

**Mitigations:**
- Restrict Babel to a dedicated Kibana Space and limit which users have access to that Space
- Apply explicit index-level security on `babel_config`: grant `read`/`write` only to the Kibana service account and administrators
- Do not install this plugin on Kibana instances where untrusted users have accounts

### 2. GitHub token storage

Personal Access Tokens entered in **Settings → GitHub Token** are stored as plaintext strings in the `babel_config` Elasticsearch index. Any process with Elasticsearch superuser access — including snapshot restore, cross-cluster replication, or direct index API calls — can read this value.

**Mitigations:**
- Use a **fine-grained PAT** scoped to `Contents: Read` on the specific repos you sync. Do not use a classic token or a token with write access.
- Rotate the token periodically, especially after staff changes.
- Limit the PAT to repositories you explicitly own or trust — the plugin does not validate that synced repos belong to your organization (see §4).

### 3. Sigma API — detection logic leaves the Kibana server

The plugin forwards the full YAML text of every SIGMA rule to the external Sigma API on every conversion, validation, and analysis request. Your detection logic — including references to internal infrastructure — leaves the Kibana server on each call.

**Mitigations:**
- Run the Sigma API on the same host or private network as Kibana so traffic does not cross untrusted networks.
- Place TLS termination in front of the API if it is accessed over any non-loopback interface; set `babel.sigmaApiUrl` to `https://`.
- Enable bearer token authentication on the API if it is exposed beyond localhost, and set `SIGMA_API_KEY` in the Kibana server environment.
- Never expose the Sigma API port (default: 8001) on a public network interface.
- Ensure the API deployment complies with your organization's data residency requirements.

### 4. GitHub repository content integrity

The sync process fetches YAML rule files from configured GitHub repositories and indexes them directly into Elasticsearch without schema validation beyond YAML parsing. A registered repository that is attacker-controlled (or compromised) can inject arbitrary key-value pairs into the `babel_sigma_doc` index.

**Mitigations:**
- Only register repositories you own or that are maintained by a trusted organization (e.g., SigmaHQ).
- If your deployment uses the stored GitHub PAT for sync, use a PAT with the narrowest possible scope (`Contents: Read`) on only the specific repos configured.
- Treat the `babel_sigma_doc` index as untrusted external data — do not grant ES roles that allow read access to this index to systems that treat its contents as trusted inputs.

### 5. Elasticsearch Watcher — Gold+ license required

The watcher creation endpoint (`POST /api/babel/sigma-add-watcher`) creates persistent scheduled queries in Elasticsearch Watcher. This requires an **Elasticsearch Gold or higher license**; on Basic clusters the call returns HTTP 403.

The `query` and `indexId` fields are not sanitized before being passed to the Watcher API. Watcher executes the query using the caller's Elasticsearch credentials (`asCurrentUser`), so no access beyond the user's existing ES permissions is possible. A malformed query returns an ES parse error; it cannot escalate privileges or access indices the user could not already read directly.

### 6. Elasticsearch index permissions

| Index | Contains |
|---|---|
| `babel_sigma_doc` | Synced SIGMA rule library |
| `babel_config` | GitHub PAT, configured repository list |

Both indices are accessible to any ES principal with matching index privileges. On multi-tenant or shared clusters:

- Apply index-level security to restrict `babel_config` to the Kibana service account and administrators only
- Treat `babel_sigma_doc` as world-readable (rule metadata is not sensitive) but limit write access to the sync process
- The `babel_sigma_doc` index is configured with `max_result_window: 50000`; ensure your ES cluster is sized for this if you enable large syncs

### 7. Docker Compose deployment — default credentials

The Docker Compose stack starts Elasticsearch with `ELASTIC_PASSWORD=changeme` and Kibana with matching credentials. These are development defaults.

**Before exposing the stack to any network beyond localhost:**
- Change the `ELASTIC_PASSWORD` in `docker-compose.yml` and the matching `ELASTICSEARCH_PASSWORD` in `Dockerfile.kibana`
- Restrict port bindings (`9200`, `5601`) to loopback (`127.0.0.1`) unless external access is required
- Enable TLS on the Elasticsearch and Kibana endpoints

### 8. Static file path traversal — defense in depth

The static asset handler (`GET /api/babel/app/{fileName}`) uses `normalize()`, a leading-`../` strip, and a `startsWith(staticDir)` guard to prevent path traversal. The primary constraint is Kibana's router, which limits `{fileName}` to a single path segment (no slashes). All three layers must fail simultaneously for traversal to succeed; this has not been found to be exploitable in current testing.

The `startsWith(staticDir)` check does not append a path separator, which would be a latent gap if the route were ever changed to a multi-segment wildcard. This is noted for future hardening.
