"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaIrReadinessRoutes = registerSigmaIrReadinessRoutes;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function authHeader() {
    return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}
function registerSigmaIrReadinessRoutes(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.post({
        path: '/api/babel/ir-readiness',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'IR readiness computed from rule tags only, no privileged data' } },
        validate: {
            body: config_schema_1.schema.object({
                scenario: config_schema_1.schema.string(),
                ruleYamls: config_schema_1.schema.arrayOf(config_schema_1.schema.string()),
            }),
        },
    }, async (_ctx, request, response) => {
        var _a;
        const { scenario, ruleYamls } = request.body;
        try {
            const res = await fetch(`${SIGMA_API_URL}/ir-readiness`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...authHeader() },
                body: JSON.stringify({ scenario, rule_yamls: ruleYamls }),
            });
            const body = await res.json().catch(() => null);
            return res.ok
                ? response.ok({ body })
                : response.customError({ statusCode: res.status, body: { message: (_a = body === null || body === void 0 ? void 0 : body.detail) !== null && _a !== void 0 ? _a : 'IR readiness failed' } });
        }
        catch (err) {
            return response.internalError({ body: { message: err instanceof Error ? err.message : 'IR readiness failed' } });
        }
    });
}
//# sourceMappingURL=sigma_ir_readiness.js.map