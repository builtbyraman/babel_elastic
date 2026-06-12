import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

function authHeader(): Record<string, string> {
  return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}

export function registerSigmaEffectivenessRoutes(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;

  router.post(
    {
      path: '/api/babel/rules/quality',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Quality score is computed from rule content, no privileged data' } },
      validate: {
        body: schema.object({ ruleYaml: schema.string() }),
      },
    },
    async (_ctx, request, response) => {
      const { ruleYaml } = request.body as { ruleYaml: string };
      try {
        const res = await fetch(`${SIGMA_API_URL}/rules/quality`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader() },
          body: JSON.stringify({ rule_yaml: ruleYaml }),
        });
        const body = await res.json().catch(() => null);
        return res.ok ? response.ok({ body }) : response.customError({ statusCode: res.status, body: { message: body?.detail ?? 'Quality score failed' } });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Quality score failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
