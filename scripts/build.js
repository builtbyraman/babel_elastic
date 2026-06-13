#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync, rmSync, readdirSync, copyFileSync } = require('fs');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const KIBANA_JSON = join(ROOT, 'kibana.json');
const TARGET = join(ROOT, 'target');
const PLUGIN_DIR = join(TARGET, 'babel');
const DOCKER_CONTAINER = 'kibana-local-dev';
const DOCKER_PLUGIN_PATH = '/usr/share/kibana/plugins/babel';

const KIBANA_SEARCH_PATHS = [
  process.env.KIBANA_HOME,
  '/usr/share/kibana',
  '/opt/kibana',
  '/usr/local/kibana',
  'C:\\Program Files\\Elastic\\Kibana',
].filter(Boolean);

// ── Version detection ─────────────────────────────────────────────────────────

function detectKibanaVersion() {
  if (process.env.KIBANA_VERSION) {
    console.log(`Using KIBANA_VERSION env var: ${process.env.KIBANA_VERSION}`);
    return process.env.KIBANA_VERSION;
  }
  for (const dir of KIBANA_SEARCH_PATHS) {
    const pkgPath = join(dir, 'package.json');
    const verPath = join(dir, 'VERSION');
    if (existsSync(pkgPath)) {
      try {
        const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (version) { console.log(`Detected Kibana ${version} from ${pkgPath}`); return version; }
      } catch {}
    }
    if (existsSync(verPath)) {
      const version = readFileSync(verPath, 'utf8').trim();
      if (version) { console.log(`Detected Kibana ${version} from ${verPath}`); return version; }
    }
  }
  // Try running Docker container
  try {
    const version = execSync(
      `docker exec ${DOCKER_CONTAINER} cat /usr/share/kibana/package.json`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const { version: v } = JSON.parse(version.toString());
    if (v) { console.log(`Detected Kibana ${v} from Docker container`); return v; }
  } catch {}
  return null;
}

function patchKibanaJson(version) {
  const manifest = JSON.parse(readFileSync(KIBANA_JSON, 'utf8'));
  if (manifest.kibanaVersion === version) {
    console.log(`kibana.json already at ${version}`);
    return;
  }
  manifest.kibanaVersion = version;
  writeFileSync(KIBANA_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Patched kibana.json → kibanaVersion: ${version}`);
}

// ── Build helpers ─────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function dockerAvailable() {
  try {
    const out = execSync(`docker inspect --format '{{.State.Running}}' ${DOCKER_CONTAINER}`, { stdio: 'pipe' }).toString().trim();
    return out === 'true';
  } catch { return false; }
}

// ── Assemble plugin directory ─────────────────────────────────────────────────

function assemblePlugin(version) {
  console.log('\nAssembling target/babel/ ...');

  if (existsSync(PLUGIN_DIR)) rmSync(PLUGIN_DIR, { recursive: true, force: true });
  mkdirSync(PLUGIN_DIR, { recursive: true });

  // kibana.json
  const manifest = JSON.parse(readFileSync(KIBANA_JSON, 'utf8'));
  writeFileSync(join(PLUGIN_DIR, 'kibana.json'), JSON.stringify(manifest, null, 2) + '\n');

  // minimal package.json required by Kibana's plugin loader
  writeFileSync(join(PLUGIN_DIR, 'package.json'), JSON.stringify({ name: 'babel', version }, null, 2) + '\n');

  // compiled server code
  cpSync(join(TARGET, 'server'), join(PLUGIN_DIR, 'server'), { recursive: true });

  // Python translation script (source, not compiled) — exclude .venv, it is OS-specific
  cpSync(
    join(ROOT, 'server', 'translation_script'),
    join(PLUGIN_DIR, 'server', 'translation_script'),
    { recursive: true, filter: (src) => !src.includes('/.venv') && !src.includes('\\.venv') }
  );

  // pre-built public bundle (Kibana nav integration)
  mkdirSync(join(PLUGIN_DIR, 'target', 'public'), { recursive: true });
  cpSync(join(TARGET, 'public'), join(PLUGIN_DIR, 'target', 'public'), { recursive: true });

  // standalone React SPA (served via server route)
  mkdirSync(join(PLUGIN_DIR, 'target', 'static'), { recursive: true });
  cpSync(join(TARGET, 'static'), join(PLUGIN_DIR, 'target', 'static'), { recursive: true });

  console.log('Plugin assembled at target/babel/');
}

// ── Zip plugin for distribution ───────────────────────────────────────────────

function assembleApi() {
  const apiSrc = join(ROOT, 'api');
  const apiDst = join(TARGET, 'api');
  console.log('\nAssembling target/api/ ...');
  if (existsSync(apiDst)) rmSync(apiDst, { recursive: true, force: true });
  cpSync(apiSrc, apiDst, { recursive: true });
  console.log('Babel API assembled at target/api/');
}

function zipPlugin(version) {
  const zipName = `babel-${version}.zip`;
  const zipPath = join(TARGET, zipName);
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  run(`zip -r "${zipPath}" babel api`, { cwd: TARGET });
  console.log(`\nDistributable zip: ${zipPath}`);
  console.log(`  Kibana plugin: babel/`);
  console.log(`  Babel API:     api/`);
}

// ── Deploy to Docker ──────────────────────────────────────────────────────────

function deployToDocker() {
  console.log(`\nDeploying to Docker container: ${DOCKER_CONTAINER}`);

  // Remove existing installation
  try {
    execSync(`docker exec -u root ${DOCKER_CONTAINER} rm -rf ${DOCKER_PLUGIN_PATH}`, { stdio: 'pipe' });
  } catch {}

  // Copy plugin into container
  run(`docker cp ${PLUGIN_DIR}/. ${DOCKER_CONTAINER}:${DOCKER_PLUGIN_PATH}/`);

  // Build Python venv inside the container (the local venv is macOS-specific and can't be reused)
  console.log('\nSetting up Python venv inside container ...');
  const VENV = `${DOCKER_PLUGIN_PATH}/server/translation_script/.venv`;
  const REQ  = `${DOCKER_PLUGIN_PATH}/server/translation_script/sigma/requirements.txt`;
  run(`docker exec -u root ${DOCKER_CONTAINER} sh -c "microdnf install -y python3.11 2>/dev/null || true"`);
  run(`docker exec -u root ${DOCKER_CONTAINER} sh -c "rm -rf ${VENV} && python3.11 -m venv ${VENV}"`);
  run(`docker exec -u root ${DOCKER_CONTAINER} sh -c "${VENV}/bin/pip install --upgrade pip --quiet"`);
  run(`docker exec -u root ${DOCKER_CONTAINER} sh -c "${VENV}/bin/pip install --quiet -r ${REQ}"`);

  // Restart container so Kibana picks up the new plugin
  console.log('\nRestarting Kibana (this takes ~30s) ...');
  run(`docker restart ${DOCKER_CONTAINER}`);
  console.log(`\nDone. Open http://localhost:5601 and look for "Babel" in the nav.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const version = detectKibanaVersion();
if (!version) {
  console.error(`
ERROR: Could not detect Kibana version.
Set KIBANA_VERSION and re-run:  KIBANA_VERSION=9.3.4 npm run build
`);
  process.exit(1);
}

patchKibanaJson(version);

// 1. Type-check
run('npx tsc --noEmit');

// 2. Compile server TypeScript → target/server/
run('npx tsc -p tsconfig.json');

// 3. Copy hand-written public JS bundles (e.g. babel.plugin.js) into target/public/
//    tsc only handles .ts/.tsx — these files must be copied manually.
const publicSrc = join(ROOT, 'public');
const publicDst = join(TARGET, 'public');
readdirSync(publicSrc)
  .filter(f => f.endsWith('.js'))
  .forEach(f => copyFileSync(join(publicSrc, f), join(publicDst, f)));

// 4. Bundle standalone React SPA → target/static/
run('npx webpack --config webpack.config.js');

// 5. Assemble target/babel/
assemblePlugin(version);

// 6. Assemble target/api/
assembleApi();

// 7. Zip for distribution → target/babel-<version>.zip (includes plugin + api)
zipPlugin(version);

// 7. Deploy to Docker if available
if (dockerAvailable()) {
  deployToDocker();
} else {
  console.log(`\nDocker container "${DOCKER_CONTAINER}" not found.`);
  console.log('Plugin is ready at target/babel/ — copy it manually to your Kibana plugins directory.');
}
