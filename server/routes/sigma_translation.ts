import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

export function registerSigmaTranslationRoute(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;
  router.get(
    {
      path: '/api/babel/sigma-translation',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: {
        query: schema.object({
          sigmaText: schema.string(),
          siemTo: schema.string(),
          pipeline: schema.maybe(schema.string()),
        }),
      },
    },
    async (_context, request, response) => {
      const { sigmaText, siemTo, pipeline = 'ecs_windows' } = request.query as {
        sigmaText: string;
        siemTo: string;
        pipeline?: string;
      };

      let sigmaYaml: string;
      try {
        sigmaYaml = Buffer.from(sigmaText, 'base64').toString('utf8');
      } catch {
        return response.badRequest({ body: { message: 'Invalid base64 in sigmaText' } });
      }

      try {
        const incomingAuth = SIGMA_API_KEY ? `Bearer ${SIGMA_API_KEY}` : '';

        const fetchRes = await fetch(`${SIGMA_API_URL}/conversions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(incomingAuth ? { authorization: incomingAuth } : {}),
          },
          body: JSON.stringify({ rule_yaml: sigmaYaml, format: siemTo, pipeline }),
        });

        const payload = await fetchRes.json().catch(() => null);

        if (!fetchRes.ok) {
          const message = payload && payload.detail ? payload.detail : `Conversion failed: ${fetchRes.status}`;
          return response.customError({ statusCode: fetchRes.status, body: { message } });
        }

        const translated = payload?.query_result ?? '';
        return response.ok({ body: { success: true, data: { translation: Buffer.from(translated).toString('base64') } } });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Conversion failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
