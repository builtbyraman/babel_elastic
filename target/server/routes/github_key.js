"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGithubKeyRoutes = registerGithubKeyRoutes;
const config_schema_1 = require("@kbn/config-schema");
const CONFIG_INDEX = 'babel_config';
const GITHUB_TOKEN_DOC_ID = 'github_token';
function maskToken(token) {
    if (token.length <= 8)
        return '****';
    return `${token.slice(0, 4)}****${token.slice(-4)}`;
}
function registerGithubKeyRoutes(router) {
    router.post({
        path: '/api/babel/get-github-token',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: false,
    }, async (context, _request, response) => {
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: GITHUB_TOKEN_DOC_ID });
            const token = doc._source?.value ?? '';
            return response.ok({
                body: { success: true, data: { apiKey: maskToken(token) } },
            });
        }
        catch (err) {
            if (err?.statusCode === 404 || err?.meta?.statusCode === 404) {
                return response.ok({ body: { success: true, data: { apiKey: '' } } });
            }
            return response.internalError({ body: { message: 'Failed to retrieve GitHub token' } });
        }
    });
    router.post({
        path: '/api/babel/set-github-token',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            body: config_schema_1.schema.object({ apiKey: config_schema_1.schema.string() }),
        },
    }, async (context, request, response) => {
        const { apiKey: token } = request.body;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            await client.index({
                index: CONFIG_INDEX,
                id: GITHUB_TOKEN_DOC_ID,
                document: { value: token },
            });
            return response.ok({ body: { success: true } });
        }
        catch (err) {
            return response.internalError({ body: { message: 'Failed to save GitHub token' } });
        }
    });
}
//# sourceMappingURL=github_key.js.map