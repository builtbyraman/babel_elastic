"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTdmUpdateRoute = registerTdmUpdateRoute;
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
            _repo_slug: { type: 'keyword' },
            _repo_name: { type: 'keyword' },
            _source_repo: { type: 'keyword' },
            _synced_at: { type: 'date' },
        },
    },
};
async function recreateSigmaIndex(client) {
    try {
        await client.indices.delete({ index: SIGMA_INDEX });
    }
    catch { /* doesn't exist yet */ }
    await client.indices.create({ index: SIGMA_INDEX, ...SIGMA_INDEX_MAPPING });
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
    var _a;
    const res = await fetch(`https://api.github.com/repos/${slug}`, { headers: githubHeaders(token) });
    if (!res.ok)
        return 'main';
    const data = await res.json();
    return (_a = data.default_branch) !== null && _a !== void 0 ? _a : 'main';
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
function registerTdmUpdateRoute(router) {
    router.post({
        path: '/api/babel/tdm-api-update-sigma',
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
        var _a, _b, _c, _d, _e, _f, _g;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        const { githubToken: bodyToken, category, limit } = request.body;
        // Resolve GitHub token
        let token = bodyToken !== null && bodyToken !== void 0 ? bodyToken : '';
        if (!token) {
            try {
                const doc = await client.get({ index: CONFIG_INDEX, id: GITHUB_TOKEN_DOC_ID });
                token = (_b = (_a = doc._source) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
            }
            catch { /* no stored token — public repos work without one */ }
        }
        // Load configured repos from Settings; fall back to default if none saved
        let repos = [];
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: REPOS_DOC_ID });
            repos = ((_d = (_c = doc._source) === null || _c === void 0 ? void 0 : _c.repos) !== null && _d !== void 0 ? _d : []).filter((r) => r.enabled);
        }
        catch { /* no settings doc yet */ }
        if (repos.length === 0)
            repos = [DEFAULT_REPO];
        try {
            // Rebuild the index with a proper mapping on every sync so field-type
            // conflicts from previous runs don't silently drop documents.
            await recreateSigmaIndex(client);
            const bulkOps = [];
            const repoSummaries = [];
            let totalFound = 0;
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
                let repoCount = 0;
                await inBatches(paths, BATCH_SIZE, async (path) => {
                    var _a, _b;
                    try {
                        const content = await fetchRuleContent(slug, resolvedBranch, path, token || undefined);
                        const parsed = js_yaml_1.default.load(content);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            const rule = normalizeDates(parsed);
                            const docId = `${slug}::${(_a = rule.id) !== null && _a !== void 0 ? _a : path}`;
                            const ruleCategory = (_b = path.split('/')[1]) !== null && _b !== void 0 ? _b : 'unknown';
                            bulkOps.push({ index: { _index: SIGMA_INDEX, _id: docId } });
                            bulkOps.push({
                                ...rule,
                                category: ruleCategory,
                                _path: path,
                                _repo_slug: slug,
                                _repo_name: repo.name,
                                _synced_at: new Date().toISOString(),
                            });
                            repoCount++;
                        }
                    }
                    catch { /* skip unparseable rules */ }
                });
                const capped = limit !== undefined && available > limit;
                repoSummaries.push(capped
                    ? `${repo.name}: ${repoCount} of ${available} rules`
                    : `${repo.name}: ${repoCount} rules`);
            }
            let totalIndexed = 0;
            let totalErrors = 0;
            if (bulkOps.length > 0) {
                const bulkRes = await client.bulk({ operations: bulkOps, refresh: true });
                if (bulkRes.errors) {
                    for (const item of ((_e = bulkRes.items) !== null && _e !== void 0 ? _e : [])) {
                        const op = (_g = (_f = item.index) !== null && _f !== void 0 ? _f : item.create) !== null && _g !== void 0 ? _g : item.update;
                        if (op === null || op === void 0 ? void 0 : op.error)
                            totalErrors++;
                        else
                            totalIndexed++;
                    }
                }
                else {
                    totalIndexed = bulkOps.length / 2;
                }
            }
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
//# sourceMappingURL=tdm_update.js.map