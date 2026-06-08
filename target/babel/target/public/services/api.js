"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiService = createApiService;
const BASE = '/api/babel';
function createApiService(http) {
    return {
        searchRules(params) {
            return http.get(`${BASE}/sigma-doc`, {
                query: params,
            });
        },
        translateRule(sigmaYaml, siemTo, pipeline = 'ecs_windows') {
            const bytes = new TextEncoder().encode(sigmaYaml);
            const sigmaText = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
            return http.get(`${BASE}/sigma-translation`, {
                query: { sigmaText, siemTo, pipeline },
            });
        },
        addWatcher(watcherName, query, indexId) {
            return http.post(`${BASE}/sigma-add-watcher`, {
                body: JSON.stringify({ watcherName, query, indexId }),
            });
        },
        getGitHubToken() {
            return http.post(`${BASE}/get-tdm-api-key`);
        },
        setGitHubToken(token) {
            return http.post(`${BASE}/set-tdm-api-key`, {
                body: JSON.stringify({ apiKey: token }),
            });
        },
        syncFromGitHub(options) {
            return http.post(`${BASE}/tdm-api-update-sigma`, {
                body: JSON.stringify(options !== null && options !== void 0 ? options : {}),
            });
        },
        getRepos() {
            return http.get(`${BASE}/repos`);
        },
        saveRepos(repos) {
            return http.post(`${BASE}/repos`, {
                body: JSON.stringify({ repos }),
            });
        },
        testRule(params) {
            var _a, _b, _c, _d;
            return http.post(`${BASE}/test-run`, {
                body: JSON.stringify({
                    ruleYaml: params.ruleYaml,
                    indexPattern: (_a = params.indexPattern) !== null && _a !== void 0 ? _a : '*',
                    timeframeHours: (_b = params.timeframeHours) !== null && _b !== void 0 ? _b : 24,
                    pipeline: (_c = params.pipeline) !== null && _c !== void 0 ? _c : 'ecs_windows',
                    queryFormat: (_d = params.queryFormat) !== null && _d !== void 0 ? _d : 'eql',
                }),
            });
        },
        deployRule(params) {
            var _a;
            return http.post(`${BASE}/deploy`, {
                body: JSON.stringify({
                    ruleYaml: params.ruleYaml,
                    format: params.format,
                    pipeline: params.pipeline,
                    schedule: params.schedule,
                    enabled: (_a = params.enabled) !== null && _a !== void 0 ? _a : false,
                }),
            });
        },
        getStatus() {
            return http.get(`${BASE}/status`);
        },
        validateRule(ruleYaml) {
            return http.post(`${BASE}/validate`, {
                body: JSON.stringify({ ruleYaml }),
            });
        },
        getFields(category) {
            return http.get(`${BASE}/fields`, {
                query: category ? { category } : {},
            });
        },
        suggestField(sigmaField) {
            return http.post(`${BASE}/fields/suggest`, {
                body: JSON.stringify({ sigmaField }),
            });
        },
        clusterHits(testRunId, topN = 5) {
            return http.post(`${BASE}/cluster-hits/${encodeURIComponent(testRunId)}`, { body: JSON.stringify({ topN }) });
        },
        computeCoverage(ruleYamls) {
            return http.post(`${BASE}/coverage`, {
                body: JSON.stringify({ ruleYamls }),
            });
        },
        navigatorExport(ruleYamls) {
            return http.post(`${BASE}/coverage/navigator-export`, {
                body: JSON.stringify({ ruleYamls }),
            });
        },
        irReadiness(scenario, ruleYamls) {
            return http.post(`${BASE}/ir-readiness`, {
                body: JSON.stringify({ scenario, ruleYamls }),
            });
        },
        getRuleQuality(ruleYaml) {
            return http.post(`${BASE}/rules/quality`, {
                body: JSON.stringify({ ruleYaml }),
            });
        },
        getDataSources() {
            return http.get(`${BASE}/data-sources`);
        },
    };
}
//# sourceMappingURL=api.js.map