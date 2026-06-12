import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

const CONFIG_INDEX = 'babel_config';
const GITHUB_TOKEN_DOC_ID = 'github_token';

function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

export function registerGithubKeyRoutes(router: IRouter): void {
  router.post(
    {
      path: '/api/babel/get-github-token',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      try {
        const doc = await (client as any).get({ index: CONFIG_INDEX, id: GITHUB_TOKEN_DOC_ID });
        const token: string = doc._source?.value ?? '';
        return response.ok({
          body: { success: true, data: { apiKey: maskToken(token) } },
        });
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.meta?.statusCode === 404) {
          return response.ok({ body: { success: true, data: { apiKey: '' } } });
        }
        return response.internalError({ body: { message: 'Failed to retrieve GitHub token' } });
      }
    }
  );

  router.post(
    {
      path: '/api/babel/set-github-token',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: {
        body: schema.object({ apiKey: schema.string() }),
      },
    },
    async (context, request, response) => {
      const { apiKey: token } = request.body as { apiKey: string };
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      try {
        await client.index({
          index: CONFIG_INDEX,
          id: GITHUB_TOKEN_DOC_ID,
          document: { value: token },
        });
        return response.ok({ body: { success: true } });
      } catch (err: unknown) {
        return response.internalError({ body: { message: 'Failed to save GitHub token' } });
      }
    }
  );
}
