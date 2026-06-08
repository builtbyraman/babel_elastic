"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaTestRunRoute = registerSigmaTestRunRoute;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function authHeaders() {
    return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}
function registerSigmaTestRunRoute(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.post({
        path: '/api/babel/test-run',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            body: config_schema_1.schema.object({
                ruleYaml: config_schema_1.schema.string(),
                indexPattern: config_schema_1.schema.string({ defaultValue: '*' }),
                timeframeHours: config_schema_1.schema.number({ defaultValue: 24, min: 1, max: 2160 }),
                pipeline: config_schema_1.schema.string({ defaultValue: 'ecs_windows' }),
                queryFormat: config_schema_1.schema.string({ defaultValue: 'eql' }),
            }),
        },
    }, async (_context, request, response) => {
        var _a;
        const { ruleYaml, indexPattern, timeframeHours, pipeline, queryFormat } = request.body;
        try {
            const fetchRes = await fetch(`${SIGMA_API_URL}/test-runs`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    rule_yaml: ruleYaml,
                    index_pattern: indexPattern,
                    timeframe_hours: timeframeHours,
                    pipeline,
                    query_format: queryFormat,
                }),
            });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                const message = (_a = payload === null || payload === void 0 ? void 0 : payload.detail) !== null && _a !== void 0 ? _a : `Test run failed: ${fetchRes.status}`;
                return response.customError({ statusCode: fetchRes.status, body: { message } });
            }
            return response.ok({ body: { success: true, data: payload } });
        }
        catch (err) {
            return response.internalError({
                body: { message: err instanceof Error ? err.message : 'Test run failed' },
            });
        }
    });
    router.post({
        path: '/api/babel/cluster-hits/{testRunId}',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Reads cached test results, no user-privileged data' } },
        validate: {
            params: config_schema_1.schema.object({ testRunId: config_schema_1.schema.string() }),
            body: config_schema_1.schema.object({ topN: config_schema_1.schema.number({ defaultValue: 5, min: 1, max: 20 }) }),
        },
    }, async (_context, request, response) => {
        var _a;
        const { testRunId } = request.params;
        const { topN } = request.body;
        try {
            const fetchRes = await fetch(`${SIGMA_API_URL}/test-runs/${encodeURIComponent(testRunId)}/cluster-hits?top_n=${topN}`, { method: 'POST', headers: authHeaders() });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                return response.customError({ statusCode: fetchRes.status, body: { message: (_a = payload === null || payload === void 0 ? void 0 : payload.detail) !== null && _a !== void 0 ? _a : 'Cluster-hits failed' } });
            }
            return response.ok({ body: { success: true, data: payload } });
        }
        catch (err) {
            return response.internalError({ body: { message: err instanceof Error ? err.message : 'Cluster-hits failed' } });
        }
    });
}
//# sourceMappingURL=sigma_test_run.js.map