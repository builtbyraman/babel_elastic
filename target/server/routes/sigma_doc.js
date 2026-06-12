"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaDocRoute = registerSigmaDocRoute;
const config_schema_1 = require("@kbn/config-schema");
const SIGMA_INDEX = 'babel_sigma_doc';
function registerSigmaDocRoute(router) {
    router.get({
        path: '/api/babel/sigma-doc',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            query: config_schema_1.schema.object({
                search: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                category: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                mitre: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                irPhase: config_schema_1.schema.maybe(config_schema_1.schema.string()),
                from: config_schema_1.schema.maybe(config_schema_1.schema.number()),
                size: config_schema_1.schema.maybe(config_schema_1.schema.number()),
            }),
        },
    }, async (context, request, response) => {
        const { search, category, mitre, irPhase, from = 0, size = 20 } = request.query;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        const must = [];
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
            const hits = result.hits;
            return response.ok({
                body: {
                    success: true,
                    data: {
                        total: hits.total?.value ?? hits.total ?? 0,
                        docs: hits.hits.map((h) => ({ id: h._id, ...h._source })),
                    },
                },
            });
        }
        catch (err) {
            return response.internalError({
                body: { message: err instanceof Error ? err.message : 'Search failed' },
            });
        }
    });
}
//# sourceMappingURL=sigma_doc.js.map