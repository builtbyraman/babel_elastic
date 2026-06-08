"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaValidateRoute = registerSigmaValidateRoute;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function registerSigmaValidateRoute(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.post({
        path: '/api/babel/validate',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Validation is stateless and has no privileged data access' } },
        validate: {
            body: config_schema_1.schema.object({
                ruleYaml: config_schema_1.schema.string(),
            }),
        },
    }, async (_context, request, response) => {
        var _a;
        const { ruleYaml } = request.body;
        const authHeader = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';
        try {
            const fetchRes = await fetch(`${SIGMA_API_URL}/rules/validate`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(authHeader ? { authorization: authHeader } : {}),
                },
                body: JSON.stringify({ rule_yaml: ruleYaml }),
            });
            const payload = await fetchRes.json().catch(() => null);
            if (!fetchRes.ok) {
                return response.customError({ statusCode: fetchRes.status, body: { message: (_a = payload === null || payload === void 0 ? void 0 : payload.detail) !== null && _a !== void 0 ? _a : 'Validation failed' } });
            }
            return response.ok({ body: payload });
        }
        catch (err) {
            return response.internalError({
                body: { message: err instanceof Error ? err.message : 'Validation failed' },
            });
        }
    });
}
//# sourceMappingURL=sigma_validate.js.map