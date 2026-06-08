"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTdmKeyRoutes = registerTdmKeyRoutes;
const config_schema_1 = require("@kbn/config-schema");
const CONFIG_INDEX = 'babel_config';
const GITHUB_TOKEN_DOC_ID = 'github_token';
function maskToken(token) {
    if (token.length <= 8)
        return '****';
    return `${token.slice(0, 4)}****${token.slice(-4)}`;
}
function registerTdmKeyRoutes(router) {
    router.post({
        path: '/api/babel/get-tdm-api-key',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: false,
    }, async (context, _request, response) => {
        var _a, _b, _c;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            const doc = await client.get({ index: CONFIG_INDEX, id: GITHUB_TOKEN_DOC_ID });
            const token = (_b = (_a = doc._source) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
            return response.ok({
                body: { success: true, data: { apiKey: maskToken(token) } },
            });
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.statusCode) === 404 || ((_c = err === null || err === void 0 ? void 0 : err.meta) === null || _c === void 0 ? void 0 : _c.statusCode) === 404) {
                return response.ok({ body: { success: true, data: { apiKey: '' } } });
            }
            return response.internalError({ body: { message: 'Failed to retrieve GitHub token' } });
        }
    });
    router.post({
        path: '/api/babel/set-tdm-api-key',
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
//# sourceMappingURL=tdm_key.js.map