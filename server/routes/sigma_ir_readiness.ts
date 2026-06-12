import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

function authHeader(): Record<string, string> {
  return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}

export function registerSigmaIrReadinessRoutes(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;

  router.post(
    {
      path: '/api/babel/ir-readiness',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'IR readiness computed from rule tags only, no privileged data' } },
      validate: {
        body: schema.object({
          scenario: schema.string(),
          ruleYamls: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (_ctx, request, response) => {
      const { scenario, ruleYamls } = request.body as { scenario: string; ruleYamls: string[] };
      try {
        const res = await fetch(`${SIGMA_API_URL}/ir-readiness`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader() },
          body: JSON.stringify({ scenario, rule_yamls: ruleYamls }),
        });
        const body = await res.json().catch(() => null);
        return res.ok
          ? response.ok({ body })
          : response.customError({ statusCode: res.status, body: { message: body?.detail ?? 'IR readiness failed' } });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'IR readiness failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
