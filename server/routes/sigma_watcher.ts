import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export function registerSigmaWatcherRoute(router: IRouter): void {
  router.post(
    {
      path: '/api/babel/sigma-add-watcher',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: {
        body: schema.object({
          watcherName: schema.string(),
          query: schema.string(),
          indexId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { watcherName, query, indexId } = request.body as {
        watcherName: string;
        query: string;
        indexId?: string;
      };

      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      const watchId = watcherName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      try {
        // Requires Elasticsearch Gold+ license (X-Pack Watcher).
        // Returns 403 on Basic/free clusters — the UI should surface this to the user.
        await (client as any).watcher.putWatch({
          id: watchId,
          trigger: {
            schedule: { interval: '5m' },
          },
          input: {
            search: {
              request: {
                indices: [indexId ?? '*'],
                body: {
                  query: {
                    query_string: {
                      query,
                      analyze_wildcard: true,
                    },
                  },
                },
              },
            },
          },
          condition: {
            compare: { 'ctx.payload.hits.total': { gt: 0 } },
          },
          actions: {
            log_hit: {
              logging: {
                text: `SIGMA alert: ${watcherName} — {{ctx.payload.hits.total}} hit(s)`,
              },
            },
          },
          metadata: {
            name: watcherName,
            created_by: 'babel',
          },
        });

        return response.ok({ body: { success: true, watchId } });
      } catch (err: unknown) {
        return response.internalError({
          body: { message: err instanceof Error ? err.message : 'Watcher creation failed' },
        });
      }
    }
  );
}