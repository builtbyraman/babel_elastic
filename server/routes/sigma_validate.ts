import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

export function registerSigmaValidateRoute(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;
  router.post(
    {
      path: '/api/babel/validate',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Validation is stateless and has no privileged data access' } },
      validate: {
        body: schema.object({
          ruleYaml: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      const { ruleYaml } = request.body as { ruleYaml: string };
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
          return response.customError({ statusCode: fetchRes.status, body: { message: payload?.detail ?? 'Validation failed' } });
        }

        return response.ok({ body: payload });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Validation failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
