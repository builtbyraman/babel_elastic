"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaWatcherRoute = registerSigmaWatcherRoute;
const config_schema_1 = require("@kbn/config-schema");
function registerSigmaWatcherRoute(router) {
    router.post({
        path: '/api/babel/sigma-add-watcher',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
        validate: {
            body: config_schema_1.schema.object({
                watcherName: config_schema_1.schema.string(),
                query: config_schema_1.schema.string(),
                indexId: config_schema_1.schema.maybe(config_schema_1.schema.string()),
            }),
        },
    }, async (context, request, response) => {
        const { watcherName, query, indexId } = request.body;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        const watchId = watcherName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        try {
            // Requires Elasticsearch Gold+ license (X-Pack Watcher).
            // Returns 403 on Basic/free clusters — the UI should surface this to the user.
            await client.watcher.putWatch({
                id: watchId,
                trigger: {
                    schedule: { interval: '5m' },
                },
                input: {
                    search: {
                        request: {
                            indices: [indexId !== null && indexId !== void 0 ? indexId : '*'],
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
        }
        catch (err) {
            return response.internalError({
                body: { message: err instanceof Error ? err.message : 'Watcher creation failed' },
            });
        }
    });
}
//# sourceMappingURL=sigma_watcher.js.map