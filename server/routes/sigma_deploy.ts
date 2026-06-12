import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

const SEVERITY_MAP: Record<string, { severity: string; risk_score: number }> = {
  low:      { severity: 'low',      risk_score: 21 },
  medium:   { severity: 'medium',   risk_score: 47 },
  high:     { severity: 'high',     risk_score: 73 },
  critical: { severity: 'critical', risk_score: 99 },
};

const FORMAT_TO_RULE_TYPE: Record<string, { type: string; language: string }> = {
  eql:        { type: 'eql',   language: 'eql' },
  esql:       { type: 'esql',  language: 'esql' },
  'es-qs':    { type: 'query', language: 'lucene' },
  dsl_lucene: { type: 'query', language: 'lucene' },
};

function buildThreatArray(tags: string[]): unknown[] {
  const techPattern = /^attack\.t(\d+(?:\.\d+)?)$/i;
  const techniques = tags
    .map(t => t.match(techPattern))
    .filter(Boolean)
    .map(m => {
      const id = `T${m![1].toUpperCase()}`;
      return {
        id,
        name: id,
        reference: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
      };
    });

  if (techniques.length === 0) return [];

  return [{
    framework: 'MITRE ATT&CK',
    tactic: { id: 'TA0000', name: 'Unknown', reference: 'https://attack.mitre.org/tactics/' },
    technique: techniques,
  }];
}

export function registerSigmaDeployRoute(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;
  const KIBANA_URL = config.kibanaUrl;
  router.post(
    {
      path: '/api/babel/deploy',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Kibana Detection Engine' } },
      validate: {
        body: schema.object({
          ruleYaml: schema.string(),
          format: schema.string({ defaultValue: 'eql' }),
          pipeline: schema.string({ defaultValue: 'ecs_windows' }),
          schedule: schema.maybe(schema.string()),
          enabled: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (_context, request, response) => {
      const { ruleYaml, format, pipeline, schedule, enabled } = request.body as {
        ruleYaml: string;
        format: string;
        pipeline: string;
        schedule?: string;
        enabled: boolean;
      };

      const ruleType = FORMAT_TO_RULE_TYPE[format];
      if (!ruleType) {
        return response.badRequest({
          body: { message: `Format '${format}' cannot be deployed as a detection rule. Use eql, esql, or es-qs.` },
        });
      }

      const authHeader = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';
      let query: string;
      let parsedRule: Record<string, unknown> = {};

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
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : String(err);
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: `Conversion error: ${_msg}` } });
      }

      try {
        const jsYaml = await import('js-yaml');
        parsedRule = (jsYaml.load(ruleYaml) as Record<string, unknown>) ?? {};
      } catch {
        // Non-fatal — use defaults
      }

      const title = (parsedRule.title as string) ?? 'Sigma Rule';
      const description = (parsedRule.description as string) ?? 'Converted from Sigma rule';
      const level = ((parsedRule.level as string) ?? 'medium').toLowerCase();
      const tags = (parsedRule.tags as string[]) ?? [];
      const references = (parsedRule.references as string[]) ?? [];

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

      const kibanaHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
      };
      if (cookieHeader) {
        kibanaHeaders['cookie'] = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader as string;
      }
      if (userAuthHeader) {
        kibanaHeaders['authorization'] = Array.isArray(userAuthHeader) ? userAuthHeader[0] : userAuthHeader as string;
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
          }).catch(() => { /* non-fatal */ });
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
      } catch (err: unknown) {
        return response.internalError({
          body: { message: `Deploy error: ${err instanceof Error ? err.message : String(err)}` },
        });
      }
    }
  );
}
