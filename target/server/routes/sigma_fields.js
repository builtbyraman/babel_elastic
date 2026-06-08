"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaFieldsRoutes = registerSigmaFieldsRoutes;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function authHeaders() {
    return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}
function registerSigmaFieldsRoutes(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.get({
        path: '/api/babel/fields',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Public ECS catalog, no sensitive data' } },
        validate: {
            query: config_schema_1.schema.object({
                category: config_schema_1.schema.maybe(config_schema_1.schema.string()),
            }),
        },
    }, async (_context, request, response) => {
        var _a;
        const category = request.query.category;
        const url = category
            ? `${SIGMA_API_URL}/fields?category=${encodeURIComponent(category)}`
            : `${SIGMA_API_URL}/fields`;
        try {
            const fetchRes = await fetch(url, { headers: { ...authHeaders() } });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                return response.customError({ statusCode: fetchRes.status, body: { message: (_a = payload === null || payload === void 0 ? void 0 : payload.detail) !== null && _a !== void 0 ? _a : 'Fields fetch failed' } });
            }
            return response.ok({ body: payload });
        }
        catch (err) {
            return response.internalError({ body: { message: err instanceof Error ? err.message : 'Fields fetch failed' } });
        }
    });
    router.post({
        path: '/api/babel/fields/suggest',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Field mapping lookup, no sensitive data' } },
        validate: {
            body: config_schema_1.schema.object({
                sigmaField: config_schema_1.schema.string(),
            }),
        },
    }, async (_context, request, response) => {
        var _a;
        const { sigmaField } = request.body;
        try {
            const fetchRes = await fetch(`${SIGMA_API_URL}/fields/suggest`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ sigma_field: sigmaField }),
            });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                return response.customError({ statusCode: fetchRes.status, body: { message: (_a = payload === null || payload === void 0 ? void 0 : payload.detail) !== null && _a !== void 0 ? _a : 'Suggest failed' } });
            }
            return response.ok({ body: payload });
        }
        catch (err) {
            return response.internalError({ body: { message: err instanceof Error ? err.message : 'Suggest failed' } });
        }
    });
}
//# sourceMappingURL=sigma_fields.js.map