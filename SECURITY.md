# Security Policy

## Supported Versions

Only the latest release is actively maintained.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report security issues by emailing the maintainer directly. Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You can expect an acknowledgement within 48 hours and a resolution timeline within 7 days of confirmation.

## Known Security Considerations

### Authorization model

All plugin API routes are accessible to **any authenticated Kibana user** regardless of their Kibana role. There is no per-feature RBAC within the plugin — a read-only analyst has the same access as an admin. This means any Kibana user can:

- Deploy detection rules to the Kibana Detection Engine
- Modify plugin settings (configured repos, GitHub token)
- Trigger rule syncs from GitHub
- Create Elasticsearch Watcher alerts

Mitigations:
- Restrict Babel to a dedicated Kibana Space and limit which users have access to that Space
- Use network-level controls to limit who can reach Kibana at all
- Do not install this plugin on Kibana instances where untrusted users have accounts

### GitHub token storage

Personal Access Tokens entered in **Settings → GitHub Token** are stored as plaintext strings in the `babel_config` Elasticsearch index (`_id: github_token`). Any user or process with Elasticsearch superuser access — including snapshot restore, cross-cluster replication, and index-level API access — can read this value.

Mitigations:
- Use a **fine-grained PAT** scoped to only `Contents: Read` on the specific repos you want to sync. Do not use a classic token or a token with write access.
- Rotate the token periodically.
- If you need stronger secret storage, consider injecting the token as a Kibana environment variable (`SIGMA_API_KEY`) rather than storing it via the UI.

### External Sigma API — data in transit

The plugin forwards the full text of every SIGMA rule YAML to the external Sigma API for conversion, validation, and analysis. This means **your detection logic leaves the Kibana server** on every conversion or analysis request. Consider:

- **Network path:** Run the Sigma API on the same host or private network as Kibana so traffic does not cross untrusted networks. If the API is remote, place TLS termination (a reverse proxy) in front of it and configure `babel.sigmaApiUrl` to use `https://`.
- **Authentication:** If the API is exposed beyond localhost, enable bearer token authentication on it and set `SIGMA_API_KEY` in the Kibana environment. The plugin forwards this token on every request.
- **Data residency:** Rules may contain proprietary detection logic or references to internal infrastructure. Ensure the API deployment complies with your organization's data handling requirements.
- **API surface:** The Sigma API has no authentication by default in development configurations. Never expose port 8001 (or whichever port the API uses) on a public network interface.

### X-Pack Watcher (Gold+ license required)

The watcher creation route (`/api/babel/sigma-add-watcher`) calls the Elasticsearch Watcher API, which requires an **Elasticsearch Gold or higher license**. On Basic-tier clusters the call returns HTTP 403. The plugin surfaces this as a generic error — users on Basic should be told explicitly that Watcher is a paid feature.

### Elasticsearch index permissions

The plugin uses two indices:

| Index | Contains |
|---|---|
| `babel_sigma_doc` | Synced rule library (rule YAML content, metadata) |
| `babel_config` | GitHub PAT, configured repository list |

Both indices are accessible to anyone with Elasticsearch cluster-level access. On shared or multi-tenant clusters, consider applying index-level security (`indices.get_field_mappings`, `read`, `write` privileges) to restrict access to these indices to the Kibana service account only.
