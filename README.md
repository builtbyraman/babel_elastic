# Babel

Cybersecurity is a literal Babel — every platform speaks a different dialect, and detection rules written for one rarely run on another. Babel reverses the challenge: Built on the updated [SIGMA](https://sigmahq.io/) open standard and running natively inside modernized Elastic and Kibana, it lets security teams author, convert, test, and deploy detection rules across platforms and tools from a single interface.

## Features

- **YAML editor** — write and validate SIGMA rules with real-time syntax feedback
- **Visual rule builder** — construct rules without writing raw YAML
- **Multi-SIEM conversion** — translate rules to 8 output formats:
  - Lucene query string
  - Query DSL
  - Kibana NDJSON
  - SIEM Rule (JSON / NDJSON)
  - EQL
  - ES|QL
  - ElastAlert
- **Live rule testing** — backtest against Elasticsearch indices with hit clustering
- **Rule deployment** — push rules directly to the Kibana Detection Engine
- **MITRE ATT&CK coverage heatmap** — visualize technique coverage across your rule set
- **IR readiness assessment** — map rules to incident response phases
- **Field suggestions** — auto-map SIGMA fields to ECS fields
- **Schema drift detection** — track changes to Elasticsearch mappings over time
- **Rule quality scoring** — assess rule effectiveness and staleness
- **Data source monitoring** — inspect available indices, document counts, and field mappings
- **GitHub sync** — pull rules from the SigmaHQ repository

---

## Requirements

### Runtime

| Dependency | Version | Notes |
|---|---|---|
| Kibana / Elasticsearch | 9.3.4 | Pinned — see note below |
| Python | 3.11+ | Required by the Sigma conversion API |

### Build tools

| Dependency | Version | Notes |
|---|---|---|
| Node.js | 20+ | Build only |
| `zip` CLI | any | Build only |

### npm packages (runtime)

| Package | Version |
|---|---|
| `@elastic/eui` | ^114.3.0 |
| `js-yaml` | ^4.2.0 |
| `react` | ^18.3.1 |
| `react-dom` | ^18.3.1 |

### npm packages (dev / build)

| Package | Version |
|---|---|
| `typescript` | ^5.9.3 |
| `webpack` | ^5.107.2 |
| `webpack-cli` | ^6.0.1 |
| `ts-loader` | ^9.6.0 |
| `html-webpack-plugin` | ^5.6.7 |
| `jest` | ^30.4.2 |
| `jest-environment-jsdom` | ^30.4.1 |
| `ts-jest` | ^29.4.11 |
| `@testing-library/react` | ^16.3.2 |
| `@types/node` | ^20.19.42 |
| `@types/react` | ^18.3.31 |
| `@types/react-dom` | ^18.3.7 |
| `@types/jest` | ^30.0.0 |
| `@types/js-yaml` | ^4.0.9 |

### Python packages (Sigma conversion engine)

These are required by `server/translation_script/sigma/`. Set up a virtual environment before building or running the conversion script:

| Package | Version |
|---|---|
| `pySigma` | >=0.11.0, <1.0.0 |
| `pySigma-backend-elasticsearch` | >=1.0.0, <2.0.0 |
| `PyYAML` | >=6.0.0, <7.0.0 |

> **Important:** `kibanaVersion` in `kibana.json` is pinned to `9.3.4`. Kibana will refuse to load the plugin on a different version. If your target version differs, re-build with `KIBANA_VERSION=<your-version> npm run build` — the build script patches `kibana.json` automatically before packaging.

---

## Quick start (Docker Compose)

> **Prerequisites:** Docker, Node.js 20+, `npm`.

```bash
# 1. Build the plugin zip
npm install
npm run build           # produces target/babel-2.0.1.zip

# 2. Configure the stack
cp .env.example .env
# Edit .env — at minimum change the passwords and point SIGMA_API_URL
# at your Sigma conversion API (see Architecture section below).

# 3. Start Elasticsearch + Kibana with the plugin installed
docker-compose up --build
```

Kibana starts at **http://localhost:[port]** (login: `elastic` / password from `.env`).

Navigate to **Babel** in the left sidebar or via search. The **Status** tab shows whether the plugin is connected to Elasticsearch and the Sigma API.

> **Note:** On first run, `docker-compose up --build` compiles the Kibana image
> with the plugin installed (~2 min). Subsequent starts skip the build.

---

## Architecture: the Sigma API

Babel depends on an **external Sigma conversion API** — a separate REST service that handles rule conversion, validation, field mapping, and quality scoring. **The plugin cannot convert or validate rules without it.**

The Kibana plugin itself is intentionally thin: it manages the UI, stores rules in Elasticsearch, and proxies conversion requests to this API. All the pySigma translation logic lives server-side in the API, keeping the plugin installable on any Kibana version without a Python runtime inside Kibana.

### What the API does

The API is a Python-based service (built on pySigma and pySigma-backend-elasticsearch) that:
- Converts SIGMA YAML to Lucene, EQL, ES|QL, KQL, NDJSON, ElastAlert, and more
- Validates rule syntax and structure
- Suggests ECS field mappings for logsource/detection fields
- Scores rule quality (coverage, staleness, completeness)
- Maps rules to MITRE ATT&CK techniques for heatmap generation
- Assesses IR readiness across incident response phases

### Running the API

The API runs as a standalone HTTP service. Point `babel.sigmaApiUrl` in `kibana.yml` (or `SIGMA_API_URL` in `.env`) at it. The URL must be reachable from **inside the Kibana process** (or container), not from your browser.

The `docker-compose.yml` includes a commented-out `sigma-api` service block — uncomment it and supply the image for your deployment.

To verify the API is reachable after startup:

```bash
curl http://<sigma-api-host>:<port>/health
# Expected: {"status": "ok"} or similar 200 response
```

The plugin's **Status** page (`Babel → Status`) also shows API reachability and response latency in real time.

### What degrades without the API

Features that call the Sigma API will return errors if it is unreachable. Features that work without it:

| Feature | Requires API |
|---|---|
| Rule editor (YAML editing, saving) | No |
| Rule library (browse, search, sync from GitHub) | No |
| Rule conversion / translation | **Yes** |
| Rule validation | **Yes** |
| Rule deployment to Detection Engine | **Yes** (conversion step) |
| MITRE ATT&CK coverage heatmap | **Yes** |
| IR readiness assessment | **Yes** |
| Field mapping suggestions | **Yes** |
| Rule quality scoring | **Yes** |
| Live rule testing (backtest) | **Yes** |

### Required API endpoints

| Method | Path | Used for |
|---|---|---|
| `GET` | `/health` | Status check |
| `POST` | `/v1/conversions` | Rule conversion and translation |
| `POST` | `/v1/validate` | YAML validation |
| `POST` | `/v1/fields` | Field mapping suggestions |
| `GET` | `/v1/quality` | Rule quality scoring |
| `POST` | `/v1/ir-readiness` | IR readiness assessment |
| `GET` | `/v1/coverage` | MITRE ATT&CK coverage mapping |
| `POST` | `/v1/rules/register` | Rule registry (optional, non-fatal if absent) |

### API authentication

If your Sigma API requires a bearer token, set the `SIGMA_API_KEY` environment variable on the Kibana server. The plugin forwards it as `Authorization: Bearer <token>` on every request to the API.

---

## Distribution: installing the pre-built zip

If you received a `babel-<version>.zip` file, install it directly into Kibana:

```bash
# Kibana must be stopped during installation
bin/kibana-plugin install file:///absolute/path/to/babel-2.0.1.zip
```

Then configure the plugin (see [Configuration](#configuration)) and restart Kibana.

To uninstall:
```bash
bin/kibana-plugin remove babel
```

---

## Building from source

### 1. Install Node dependencies

```bash
npm install
```

### 2. Set up the Python translation engine

The bundled Python script requires a virtual environment with pySigma. Run this once before building:

```bash
cd server/translation_script/sigma
python3.11 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
cd ../../..
```

### 3. Build

The build script auto-detects your Kibana version from a local install or a running Docker container named `kibana-local-dev`. If neither is present, set the version explicitly:

```bash
KIBANA_VERSION=9.3.4 npm run build
```

On success the script produces:
- `target/babel/` — assembled plugin directory
- `target/babel-<version>.zip` — distributable zip ready for `kibana-plugin install`

If the Docker container `kibana-local-dev` is running, the script also copies the plugin into the container and restarts Kibana automatically.

### 4. Manual install (no Docker)

```bash
cp -r target/babel/ /usr/share/kibana/plugins/babel
# Then restart Kibana
```

---

## Configuration

Add the following to `kibana.yml`:

```yaml
# URL of the Sigma conversion API — required, no default will work outside Docker
babel.sigmaApiUrl: "http://<sigma-api-host>:<port>/v1"

# URL Kibana uses to call itself when deploying detection rules
# Defaults to http://localhost:5601 — change if Kibana is behind a proxy or on a different host
babel.kibanaUrl: "http://localhost:5601"
```

### Environment variables (optional)

| Variable | Purpose |
|---|---|
| `SIGMA_API_KEY` | Bearer token forwarded to the Sigma API if it requires authentication |

---

## Elasticsearch prerequisites

The plugin creates and uses two indices in your Elasticsearch cluster:

| Index | Purpose |
|---|---|
| `babel_sigma_doc` | Rule library synced from GitHub repositories |
| `babel_config` | Plugin settings (GitHub tokens, configured repos) |

Both indices are bootstrapped automatically on first run. If your cluster has `action.auto_create_index: false`, create them manually before starting Kibana:

```bash
curl -X PUT "http://localhost:9200/babel_config"
curl -X PUT "http://localhost:9200/babel_sigma_doc"
```

### GitHub rate limits

The rule sync feature fetches each YAML file individually from GitHub. Without a token, GitHub allows 60 unauthenticated requests per hour — not enough to sync large repos like SigmaHQ (~3,000 rules). **A GitHub Personal Access Token is strongly recommended.** Use a fine-grained PAT with only `Contents: Read` permission on the target repos. Store it in Settings → GitHub Token within the plugin.

### Authorization

All plugin API routes are accessible to any authenticated Kibana user. There is no per-route RBAC — a read-only analyst can deploy rules the same as an admin. Restrict access at the Kibana Space or network level if needed.

---

## Development

```bash
# Type-check without building
npm run typecheck

# Run tests (79 tests across server + public)
npm test

# Full build
KIBANA_VERSION=9.3.4 npm run build
```

### Project structure

```
public/
  components/     React UI components
  hooks/          Custom hooks (editor sync, auto pipeline selection)
  services/       API client
  context/        Kibana service provider
server/
  routes/         Kibana server-side API routes
  translation_script/sigma/   Python SIGMA conversion engine (pySigma)
  plugin.ts       Kibana plugin lifecycle
  config.ts       Plugin configuration schema
scripts/
  build.js        Build orchestrator (typecheck → compile → webpack → zip)
.github/
  workflows/ci.yml   CI: typecheck, test, build, upload zip artifact
```

---

## License

Licensed under the [Apache License 2.0](LICENSE). Free to use, modify, and distribute — including in commercial and enterprise environments — without obligation to open source your modifications.
