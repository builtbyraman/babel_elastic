"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaDeployRoute = registerSigmaDeployRoute;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';
const SEVERITY_MAP = {
    low: { severity: 'low', risk_score: 21 },
    medium: { severity: 'medium', risk_score: 47 },
    high: { severity: 'high', risk_score: 73 },
    critical: { severity: 'critical', risk_score: 99 },
};
const FORMAT_TO_RULE_TYPE = {
    eql: { type: 'eql', language: 'eql' },
    esql: { type: 'esql', language: 'esql' },
    'es-qs': { type: 'query', language: 'lucene' },
    dsl_lucene: { type: 'query', language: 'lucene' },
};
function buildThreatArray(tags) {
    const techPattern = /^attack\.t(\d+(?:\.\d+)?)$/i;
    const techniques = tags
        .map(t => t.match(techPattern))
        .filter(Boolean)
        .map(m => {
        const id = `T${m[1].toUpperCase()}`;
        return {
            id,
            name: id,
            reference: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
        };
    });
    if (techniques.length === 0)
        return [];
    return [{
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0000', name: 'Unknown', reference: 'https://attack.mitre.org/tactics/' },
            technique: techniques,
        }];
}
function registerSigmaDeployRoute(router, config) {
    const SIGMA_API_URL = config.sigmaApiUrl;
    const KIBANA_URL = config.kibanaUrl;
    router.post({
        path: '/api/babel/deploy',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Kibana Detection Engine' } },
        validate: {
            body: config_schema_1.schema.object({
                ruleYaml: config_schema_1.schema.string(),
                format: config_schema_1.schema.string({ defaultValue: 'eql' }),
                pipeline: config_schema_1.schema.string({ defaultValue: 'ecs_windows' }),
                schedule: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                enabled: config_schema_1.schema.boolean({ defaultValue: false }),
            }),
        },
    }, async (_context, request, response) => {
        const { ruleYaml, format, pipeline, schedule, enabled } = request.body;
        const ruleType = FORMAT_TO_RULE_TYPE[format];
        if (!ruleType) {
            return response.badRequest({
                body: { message: `Format '${format}' cannot be deployed as a detection rule. Use eql, esql, or es-qs.` },
            });
        }
        const authHeader = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';
        let query;
        let parsedRule = {};
        try {
            const convRes = await fetch(`${SIGMA_API_URL}/conversions`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(authHeader ? { authorization: authHeader } : {}),
                },
                body: JSON.stringify({ rule_yaml: ruleYaml, format, pipeline }),
            });
            const convPayload = await convRes.json().catch(() => null);
            if (!convRes.ok) {
                const msg = convPayload?.detail ?? `Conversion failed: ${convRes.status}`;
                return response.customError({ statusCode: convRes.status, body: { message: msg } });
            }
            query = convPayload?.query_result ?? '';
        }
        catch (err) {
            const _msg = err instanceof Error ? err.message : String(err);
            if (err instanceof TypeError)
                return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
            return response.internalError({ body: { message: `Conversion error: ${_msg}` } });
        }
        try {
            const jsYaml = await Promise.resolve().then(() => __importStar(require('js-yaml')));
            parsedRule = jsYaml.load(ruleYaml) ?? {};
        }
        catch {
            // Non-fatal — use defaults
        }
        const title = parsedRule.title ?? 'Sigma Rule';
        const description = parsedRule.description ?? 'Converted from Sigma rule';
        const level = (parsedRule.level ?? 'medium').toLowerCase();
        const tags = parsedRule.tags ?? [];
        const references = parsedRule.references ?? [];
        const { severity, risk_score } = SEVERITY_MAP[level] ?? SEVERITY_MAP.medium;
        const detectionRule = {
            name: title,
            description,
            severity,
            risk_score,
            type: ruleType.type,
            language: ruleType.language,
            query,
            enabled,
            interval: schedule ?? '5m',
            from: 'now-360s',
            max_signals: 100,
            tags: tags.filter(t => !t.startsWith('attack.')),
            references,
            threat: buildThreatArray(tags),
            ...(ruleType.type === 'eql' ? {} : { index: ['*'] }),
        };
        const cookieHeader = request.headers['cookie'];
        const userAuthHeader = request.headers['authorization'];
        const kibanaHeaders = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
        };
        if (cookieHeader) {
            kibanaHeaders['cookie'] = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
        }
        if (userAuthHeader) {
            kibanaHeaders['authorization'] = Array.isArray(userAuthHeader) ? userAuthHeader[0] : userAuthHeader;
        }
        try {
            const deployRes = await fetch(`${KIBANA_URL}/api/detection_engine/rules`, {
                method: 'POST',
                headers: kibanaHeaders,
                body: JSON.stringify(detectionRule),
            });
            const deployPayload = await deployRes.json().catch(() => null);
            if (!deployRes.ok) {
                const msg = deployPayload?.message ?? `Deploy failed: ${deployRes.status}`;
                return response.customError({ statusCode: deployRes.status, body: { message: msg } });
            }
            if (deployPayload?.id) {
                fetch(`${SIGMA_API_URL}/rules/register`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        ...(SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {}),
                    },
                    body: JSON.stringify({
                        kibana_rule_id: deployPayload.id,
                        rule_yaml: ruleYaml,
                        title,
                    }),
                }).catch(() => { });
            }
            return response.ok({
                body: {
                    success: true,
                    data: {
                        rule_id: deployPayload?.id,
                        name: deployPayload?.name,
                        enabled: deployPayload?.enabled,
                        created_at: deployPayload?.created_at,
                    },
                },
            });
        }
        catch (err) {
            return response.internalError({
                body: { message: `Deploy error: ${err instanceof Error ? err.message : String(err)}` },
            });
        }
    });
}
//# sourceMappingURL=sigma_deploy.js.map