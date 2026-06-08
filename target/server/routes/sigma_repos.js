"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaReposRoutes = registerSigmaReposRoutes;
const config_schema_1 = require("@kbn/config-schema");
const CONFIG_INDEX = 'babel_config';
const REPOS_DOC_ID = 'sigma_repos';
function registerSigmaReposRoutes(router) {
    // GET /api/babel/repos
    router.get({
        path: '/api/babel/repos',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Config read via asCurrentUser' } },
        validate: false,
    }, async (context, _req, response) => {
        var _a, _b, _c;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: REPOS_DOC_ID });
            return response.ok({ body: { success: true, data: { repos: (_b = (_a = doc._source) === null || _a === void 0 ? void 0 : _a.repos) !== null && _b !== void 0 ? _b : [] } } });
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.statusCode) === 404) {
                return response.ok({ body: { success: true, data: { repos: [] } } });
            }
            return response.internalError({ body: { message: (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : 'Failed to load repos' } });
        }
    });
    // POST /api/babel/repos
    router.post({
        path: '/api/babel/repos',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Config write via asCurrentUser' } },
        validate: {
            body: config_schema_1.schema.object({
                repos: config_schema_1.schema.arrayOf(config_schema_1.schema.object({
                    id: config_schema_1.schema.string(),
                    name: config_schema_1.schema.string(),
                    url: config_schema_1.schema.string(),
                    branch: config_schema_1.schema.string(),
                    rulesPath: config_schema_1.schema.string(),
                    enabled: config_schema_1.schema.boolean(),
                })),
            }),
        },
    }, async (context, request, response) => {
        var _a;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        const { repos } = request.body;
        try {
            await client.index({
                index: CONFIG_INDEX,
                id: REPOS_DOC_ID,
                document: { repos },
                refresh: true,
            });
            return response.ok({ body: { success: true } });
        }
        catch (err) {
            return response.internalError({ body: { message: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : 'Failed to save repos' } });
        }
    });
}
//# sourceMappingURL=sigma_repos.js.map