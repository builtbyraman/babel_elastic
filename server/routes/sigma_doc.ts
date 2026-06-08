import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

const SIGMA_INDEX = 'babel_sigma_doc';

export function registerSigmaDocRoute(router: IRouter): void {
  router.get(
    {
      path: '/api/babel/sigma-doc',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string()),
          category: schema.maybe(schema.string()),
          mitre: schema.maybe(schema.string()),
          irPhase: schema.maybe(schema.string()),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const { search, category, mitre, irPhase, from = 0, size = 20 } = request.query as {
        search?: string;
        category?: string;
        mitre?: string;
        irPhase?: string;
        from?: number;
        size?: number;
      };

      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      const must: unknown[] = [];

      if (search) {
        const sanitised = search.slice(0, 128).replace(/[<>{}[\]]/g, '');
        must.push({
          multi_match: {
            query: sanitised,
            fields: ['title', 'description', 'tags'],
            type: 'best_fields',
          },
        });
      }

      if (category) {
        must.push({ term: { category } });
      }

      if (mitre) {
        const sanitisedMitre = mitre.slice(0, 64).replace(/[^a-z0-9.\-]/gi, '');
        must.push({ term: { 'tags.keyword': `attack.${sanitisedMitre}` } });
      }

      if (irPhase) {
        const sanitisedPhase = irPhase.slice(0, 32).replace(/[^a-z\-]/gi, '');
        must.push({ term: { 'x-ir-phase': sanitisedPhase } });
      }

      try {
        const result = await client.search({
          index: SIGMA_INDEX,
          from,
          size,
          track_total_hits: true,
          query: must.length > 0 ? { bool: { must } } : { match_all: {} },
          sort: [{ 'title.keyword': { order: 'asc' } }],
        });

        const hits = (result as any).hits;
        return response.ok({
          body: {
            success: true,
            data: {
              total: hits.total?.value ?? hits.total ?? 0,
              docs: hits.hits.map((h: any) => ({ id: h._id, ...h._source })),
            },
          },
        });
      } catch (err: unknown) {
        return response.internalError({
          body: { message: err instanceof Error ? err.message : 'Search failed' },
        });
      }
    }
  );
}