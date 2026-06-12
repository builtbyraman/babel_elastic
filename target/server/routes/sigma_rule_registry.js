"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaRuleRegistryRoutes = registerSigmaRuleRegistryRoutes;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
function authHeader() {
    return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}
function registerSigmaRuleRegistryRoutes(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    router.post({
        path: '/api/babel/rules/register',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Registry stores rule metadata, no privileged data access' } },
        validate: {
            body: config_schema_1.schema.object({
                kibanaRuleId: config_schema_1.schema.string(),
                ruleYaml: config_schema_1.schema.string(),
                title: config_schema_1.schema.string(),
            }),
        },
    }, async (_ctx, request, response) => {
        var _a;
        const { kibanaRuleId, ruleYaml, title } = request.body;
        try {
            const res = await fetch(`${SIGMA_API_URL}/rules/register`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...authHeader() },
                body: JSON.stringify({ kibana_rule_id: kibanaRuleId, rule_yaml: ruleYaml, title }),
            });
            const body = await res.json().catch(() => null);
            return res.ok ? response.ok({ body }) : response.customError({ statusCode: res.status, body: { message: (_a = body === null || body === void 0 ? void 0 : body.detail) !== null && _a !== void 0 ? _a : 'Registration failed' } });
        }
        catch (err) {
            const _msg = err instanceof Error ? err.message : 'Registration failed';
            if (err instanceof TypeError)
                return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
            return response.internalError({ body: { message: _msg } });
        }
    });
}
//# sourceMappingURL=sigma_rule_registry.js.map