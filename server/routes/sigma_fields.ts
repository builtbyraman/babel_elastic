import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

function authHeaders(): Record<string, string> {
  return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}

export function registerSigmaFieldsRoutes(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;

  router.get(
    {
      path: '/api/babel/fields',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Public ECS catalog, no sensitive data' } },
      validate: {
        query: schema.object({
          category: schema.maybe(schema.string()),
        }),
      },
    },
    async (_context, request, response) => {
      const category = (request.query as { category?: string }).category;
      const url = category
        ? `${SIGMA_API_URL}/fields?category=${encodeURIComponent(category)}`
        : `${SIGMA_API_URL}/fields`;

      try {
        const fetchRes = await fetch(url, { headers: { ...authHeaders() } });
        const payload = await fetchRes.json().catch(() => null);
        if (!fetchRes.ok) {
          return response.customError({ statusCode: fetchRes.status, body: { message: payload?.detail ?? 'Fields fetch failed' } });
        }
        return response.ok({ body: payload });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Fields fetch failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );

  router.post(
    {
      path: '/api/babel/fields/suggest',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Field mapping lookup, no sensitive data' } },
      validate: {
        body: schema.object({
          sigmaField: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      const { sigmaField } = request.body as { sigmaField: string };

      try {
        const fetchRes = await fetch(`${SIGMA_API_URL}/fields/suggest`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ sigma_field: sigmaField }),
        });
        const payload = await fetchRes.json().catch(() => null);
        if (!fetchRes.ok) {
          return response.customError({ statusCode: fetchRes.status, body: { message: payload?.detail ?? 'Suggest failed' } });
        }
        return response.ok({ body: payload });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Suggest failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
