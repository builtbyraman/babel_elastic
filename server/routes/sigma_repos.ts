import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

const CONFIG_INDEX = 'babel_config';
const REPOS_DOC_ID = 'sigma_repos';

export interface SigmaRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  rulesPath: string;
  enabled: boolean;
}

export function registerSigmaReposRoutes(router: IRouter): void {
  // GET /api/babel/repos
  router.get(
    {
      path: '/api/babel/repos',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Config read via asCurrentUser' } },
      validate: false,
    },
    async (context, _req, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      try {
        const doc = await (client as any).get({ index: CONFIG_INDEX, id: REPOS_DOC_ID });
        return response.ok({ body: { success: true, data: { repos: doc._source?.repos ?? [] } } });
      } catch (err: any) {
        if (err?.statusCode === 404) {
          return response.ok({ body: { success: true, data: { repos: [] } } });
        }
        return response.internalError({ body: { message: err?.message ?? 'Failed to load repos' } });
      }
    }
  );

  // POST /api/babel/repos
  router.post(
    {
      path: '/api/babel/repos',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Config write via asCurrentUser' } },
      validate: {
        body: schema.object({
          repos: schema.arrayOf(
            schema.object({
              id:        schema.string(),
              name:      schema.string(),
              url:       schema.string(),
              branch:    schema.string(),
              rulesPath: schema.string(),
              enabled:   schema.boolean(),
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      const { repos } = request.body as { repos: SigmaRepo[] };
      try {
        await (client as any).index({
          index: CONFIG_INDEX,
          id: REPOS_DOC_ID,
          document: { repos },
          refresh: true,
        });
        return response.ok({ body: { success: true } });
      } catch (err: any) {
        return response.internalError({ body: { message: err?.message ?? 'Failed to save repos' } });
      }
    }
  );
}
