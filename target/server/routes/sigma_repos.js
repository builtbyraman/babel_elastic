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
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: REPOS_DOC_ID });
            return response.ok({ body: { success: true, data: { repos: doc._source?.repos ?? [] } } });
        }
        catch (err) {
            if (err?.statusCode === 404) {
                return response.ok({ body: { success: true, data: { repos: [] } } });
            }
            return response.internalError({ body: { message: err?.message ?? 'Failed to load repos' } });
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
            return response.internalError({ body: { message: err?.message ?? 'Failed to save repos' } });
        }
    });
}
//# sourceMappingURL=sigma_repos.js.map