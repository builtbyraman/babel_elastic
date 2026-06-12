"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGithubSyncRoute = registerGithubSyncRoute;
const config_schema_1 = require("@kbn/config-schema");
const js_yaml_1 = __importDefault(require("js-yaml"));
const CONFIG_INDEX = 'babel_config';
const SIGMA_INDEX = 'babel_sigma_doc';
const REPOS_DOC_ID = 'sigma_repos';
const GITHUB_TOKEN_DOC_ID = 'github_token';
const BATCH_SIZE = 10;
// Explicit mapping avoids type-conflict rejections across different SIGMA rule collections.
// The `detection` field is disabled (stored in _source but not indexed) because its
// sub-field names and value types vary wildly between rules and repos, causing ES to
// reject documents when field types conflict.
const SIGMA_INDEX_MAPPING = {
    settings: { index: { max_result_window: 50000 } },
    mappings: {
        dynamic: true,
        properties: {
            title: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 512 } } },
            description: { type: 'text' },
            id: { type: 'keyword' },
            status: { type: 'keyword' },
            level: { type: 'keyword' },
            author: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
            date: { type: 'keyword' },
            modified: { type: 'keyword' },
            tags: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            category: { type: 'keyword' },
            references: { type: 'keyword' },
            falsepositives: { type: 'text' },
            logsource: {
                properties: {
                    product: { type: 'keyword' },
                    category: { type: 'keyword' },
                    service: { type: 'keyword' },
                },
            },
            // detection sub-fields vary too much to index safely — store only, don't index
            detection: { type: 'object', enabled: false },
            'x-ir-phase': { type: 'keyword' },
            _path: { type: 'keyword' },
            _repo_id: { type: 'keyword' },
            _repo_slug: { type: 'keyword' },
            _repo_name: { type: 'keyword' },
            _source_repo: { type: 'keyword' },
            _synced_at: { type: 'date' },
        },
    },
};
async function ensureSigmaIndex(client) {
    const exists = await client.indices.exists({ index: SIGMA_INDEX });
    if (!exists) {
        await client.indices.create({ index: SIGMA_INDEX, ...SIGMA_INDEX_MAPPING });
    }
}
async function deleteRepoRules(client, repoId) {
    try {
        await client.deleteByQuery({
            index: SIGMA_INDEX,
            refresh: true,
            query: { term: { _repo_id: repoId } },
        });
    }
    catch { /* index may be empty */ }
}
// Fallback repo used when no repos are configured in Settings
const DEFAULT_REPO = {
    id: 'default',
    name: 'SigmaHQ Official',
    url: 'https://github.com/SigmaHQ/sigma',
    branch: 'master',
    rulesPath: 'rules/',
    enabled: true,
};
// js-yaml converts YAML date scalars (2024-02-25) into JS Date objects.
// Recursively convert them back to YYYY-MM-DD so pySigma doesn't reject them.
function normalizeDates(val) {
    if (val instanceof Date)
        return val.toISOString().split('T')[0];
    if (Array.isArray(val))
        return val.map(normalizeDates);
    if (val !== null && typeof val === 'object') {
        return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, normalizeDates(v)]));
    }
    return val;
}
function ownerRepo(url) {
    const m = url.match(/github\.com\/([^/\s]+\/[^/\s]+)/);
    return m ? m[1].replace(/\.git$/, '') : url;
}
function githubHeaders(token) {
    const h = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'babel-kibana-plugin',
    };
    if (token)
        h['Authorization'] = `Bearer ${token}`;
    return h;
}
async function detectDefaultBranch(slug, token) {
    const res = await fetch(`https://api.github.com/repos/${slug}`, { headers: githubHeaders(token) });
    if (!res.ok)
        return 'main';
    const data = await res.json();
    return data.default_branch ?? 'main';
}
async function getRepoFilePaths(repo, token) {
    const slug = ownerRepo(repo.url);
    const prefix = repo.rulesPath.replace(/\/?$/, '/');
    async function fetchTree(branch) {
        const url = `https://api.github.com/repos/${slug}/git/trees/${branch}?recursive=1`;
        const res = await fetch(url, { headers: githubHeaders(token) });
        if (res.status === 404 || res.status === 409)
            return null;
        if (!res.ok)
            throw new Error(`GitHub API error ${res.status} for ${slug}: ${await res.text()}`);
        return res.json();
    }
    let data = await fetchTree(repo.branch);
    let branch = repo.branch;
    // Configured branch not found — auto-detect the real default branch and retry
    if (!data) {
        branch = await detectDefaultBranch(slug, token);
        data = await fetchTree(branch);
        if (!data)
            throw new Error(`Branch "${repo.branch}" not found on ${slug} (tried default "${branch}" too)`);
    }
    const paths = data.tree
        .filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.path.endsWith('.yml'))
        .map(f => f.path);
    return { paths, branch };
}
async function fetchRuleContent(slug, branch, path, token) {
    const url = `https://raw.githubusercontent.com/${slug}/${branch}/${path}`;
    const res = await fetch(url, { headers: githubHeaders(token) });
    if (!res.ok)
        throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.text();
}
async function inBatches(items, size, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += size) {
        const batch = await Promise.all(items.slice(i, i + size).map(fn));
        results.push(...batch);
    }
    return results;
}
function registerGithubSyncRoute(router) {
    router.post({
        path: '/api/babel/sync',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            body: config_schema_1.schema.object({
                githubToken: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                category: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                limit: config_schema_1.schema.maybe(config_schema_1.schema.number()),
            }),
        },
    }, async (context, request, response) => {
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        const { githubToken: bodyToken, category, limit } = request.body;
        // Resolve GitHub token
        let token = bodyToken ?? '';
        if (!token) {
            try {
                const doc = await client.get({ index: CONFIG_INDEX, id: GITHUB_TOKEN_DOC_ID });
                token = doc._source?.value ?? '';
            }
            catch { /* no stored token — public repos work without one */ }
        }
        // Load configured repos from Settings; fall back to default if none saved
        let repos = [];
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: REPOS_DOC_ID });
            repos = (doc._source?.repos ?? []).filter((r) => r.enabled);
        }
        catch { /* no settings doc yet */ }
        if (repos.length === 0)
            repos = [DEFAULT_REPO];
        try {
            // Ensure index exists with the correct mapping. Does NOT delete existing data,
            // so repos that aren't being re-synced keep their rules.
            await ensureSigmaIndex(client);
            const repoSummaries = [];
            let totalFound = 0;
            let totalIndexed = 0;
            let totalErrors = 0;
            for (const repo of repos) {
                const slug = ownerRepo(repo.url);
                let paths;
                let resolvedBranch;
                try {
                    ({ paths, branch: resolvedBranch } = await getRepoFilePaths(repo, token || undefined));
                }
                catch (err) {
                    repoSummaries.push(`${repo.name}: error — ${err instanceof Error ? err.message : 'failed'}`);
                    continue;
                }
                if (category) {
                    paths = paths.filter(p => p.split('/')[1] === category);
                }
                const available = paths.length;
                totalFound += available;
                if (limit !== undefined)
                    paths = paths.slice(0, limit);
                // Delete only this specific configured entry's rules (keyed by repo.id,
                // not slug) so multiple paths from the same GitHub repo stay isolated.
                await deleteRepoRules(client, repo.id);
                let repoCount = 0;
                let repoErrors = 0;
                const parsed = await inBatches(paths, BATCH_SIZE, async (path) => {
                    try {
                        const content = await fetchRuleContent(slug, resolvedBranch, path, token || undefined);
                        const doc = js_yaml_1.default.load(content);
                        if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
                            const rule = normalizeDates(doc);
                            // Use repo.id as the ID namespace so rules from different configured
                            // paths of the same repo never collide with each other.
                            const docId = `${repo.id}::${rule.id ?? path}`;
                            const ruleCategory = path.split('/')[1] ?? 'unknown';
                            return { docId, ruleCategory, rule, path };
                        }
                    }
                    catch { /* skip unparseable rules */ }
                    return null;
                });
                const bulkOps = [];
                for (const r of parsed) {
                    if (!r)
                        continue;
                    bulkOps.push({ index: { _index: SIGMA_INDEX, _id: r.docId } });
                    bulkOps.push({
                        ...r.rule,
                        category: r.ruleCategory,
                        _path: r.path,
                        _repo_id: repo.id,
                        _repo_slug: slug,
                        _repo_name: repo.name,
                        _synced_at: new Date().toISOString(),
                    });
                }
                if (bulkOps.length > 0) {
                    const bulkRes = await client.bulk({ operations: bulkOps, refresh: false });
                    if (bulkRes.errors) {
                        for (const item of (bulkRes.items ?? [])) {
                            const op = item.index ?? item.create ?? item.update;
                            if (op?.error)
                                repoErrors++;
                            else
                                repoCount++;
                        }
                    }
                    else {
                        repoCount = bulkOps.length / 2;
                    }
                }
                totalIndexed += repoCount;
                totalErrors += repoErrors;
                const capped = limit !== undefined && available > limit;
                const errNote = repoErrors > 0 ? ` (${repoErrors} errors)` : '';
                repoSummaries.push(capped
                    ? `${repo.name}: ${repoCount} of ${available} rules${errNote}`
                    : `${repo.name}: ${repoCount} rules${errNote}`);
            }
            // Final refresh so the UI sees all newly indexed docs immediately.
            try {
                await client.indices.refresh({ index: SIGMA_INDEX });
            }
            catch { /* ok */ }
            const summary = totalErrors > 0
                ? `Indexed ${totalIndexed} rules (${totalErrors} errors) — ${repoSummaries.join(', ')}`
                : `Synced ${totalIndexed} rules — ${repoSummaries.join(', ')}`;
            return response.ok({
                body: {
                    success: true,
                    synced: totalIndexed,
                    total_found: totalFound,
                    message: summary,
                },
            });
        }
        catch (err) {
            return response.internalError({
                body: { message: err instanceof Error ? err.message : 'Sync failed' },
            });
        }
    });
}
//# sourceMappingURL=github_sync.js.map