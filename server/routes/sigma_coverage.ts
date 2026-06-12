import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

export function registerSigmaCoverageRoute(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;

  router.post(
    {
      path: '/api/babel/coverage/navigator-export',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Navigator export computed from rule tags only, no privileged data' } },
      validate: {
        body: schema.object({
          ruleYamls: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (_context, request, response) => {
      const { ruleYamls } = request.body as { ruleYamls: string[] };
      const authHeader = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';
      try {
        const fetchRes = await fetch(`${SIGMA_API_URL}/coverage/navigator-export`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(authHeader ? { authorization: authHeader } : {}),
          },
          body: JSON.stringify({ rule_yamls: ruleYamls }),
        });
        const payload = await fetchRes.json().catch(() => null);
        if (!fetchRes.ok) {
          return response.customError({
            statusCode: fetchRes.status,
            body: { message: payload?.detail ?? 'Navigator export failed' },
          });
        }
        return response.ok({ body: payload });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Navigator export failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );

  router.post(
    {
      path: '/api/babel/coverage',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Coverage is computed from rule tags, no privileged data access' } },
      validate: {
        body: schema.object({
          ruleYamls: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (_context, request, response) => {
      const { ruleYamls } = request.body as { ruleYamls: string[] };
      const authHeader = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';

      try {
        const fetchRes = await fetch(`${SIGMA_API_URL}/coverage`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(authHeader ? { authorization: authHeader } : {}),
          },
          body: JSON.stringify({ rule_yamls: ruleYamls }),
        });

        const payload = await fetchRes.json().catch(() => null);

        if (!fetchRes.ok) {
          return response.customError({
            statusCode: fetchRes.status,
            body: { message: payload?.detail ?? 'Coverage computation failed' },
          });
        }

        return response.ok({ body: payload });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Coverage computation failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
