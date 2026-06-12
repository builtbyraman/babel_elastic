"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaTranslationRoute = registerSigmaTranslationRoute;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function registerSigmaTranslationRoute(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.get({
        path: '/api/babel/sigma-translation',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            query: config_schema_1.schema.object({
                sigmaText: config_schema_1.schema.string(),
                siemTo: config_schema_1.schema.string(),
                pipeline: config_schema_1.schema.maybe(config_schema_1.schema.string()),
            }),
        },
    }, async (_context, request, response) => {
        var _a;
        const { sigmaText, siemTo, pipeline = 'ecs_windows' } = request.query;
        let sigmaYaml;
        try {
            sigmaYaml = Buffer.from(sigmaText, 'base64').toString('utf8');
        }
        catch {
            return response.badRequest({ body: { message: 'Invalid base64 in sigmaText' } });
        }
        try {
            const incomingAuth = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';
            const fetchRes = await fetch(`${SIGMA_API_URL}/conversions`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(incomingAuth ? { authorization: incomingAuth } : {}),
                },
                body: JSON.stringify({ rule_yaml: sigmaYaml, format: siemTo, pipeline }),
            });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                const message = payload && payload.detail ? payload.detail : `Conversion failed: ${fetchRes.status}`;
                return response.customError({ statusCode: fetchRes.status, body: { message } });
            }
            const translated = (_a = payload === null || payload === void 0 ? void 0 : payload.query_result) !== null && _a !== void 0 ? _a : '';
            return response.ok({ body: { success: true, data: { translation: Buffer.from(translated).toString('base64') } } });
        }
        catch (err) {
            const _msg = err instanceof Error ? err.message : 'Conversion failed';
            if (err instanceof TypeError)
                return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
            return response.internalError({ body: { message: _msg } });
        }
    });
}
//# sourceMappingURL=sigma_translation.js.map