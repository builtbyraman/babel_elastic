import { IRouter } from '@kbn/core/server';
import { PluginConfig } from '../config';

function nowIso() {
  return new Date().toISOString();
}

export function registerStatusRoute(router: IRouter, config: PluginConfig): void {
  router.get(
    {
      path: '/api/babel/status',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Status endpoint' } },
      validate: false,
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      const status: any = { timestamp: nowIso(), services: [], errors: [] };

      const SIGMA_API_URL = config.sigmaApiUrl || process.env.SIGMA_API_URL || 'http://localhost:8000/v1';
      const HEALTH_URL = SIGMA_API_URL.replace(/\/v1\/?$/, '') + '/health';
      try {
        const start = Date.now();
        const res = await fetch(HEALTH_URL, { method: 'GET', signal: AbortSignal.timeout(5000) });
        const latency = Date.now() - start;
        let body = null;
        try { body = await res.json(); } catch {}
        status.services.push({ name: 'Sigma Conversion API', url: SIGMA_API_URL, status: res.ok ? 'ok' : 'degraded', latency_ms: latency, last_checked: nowIso(), info: body });
      } catch (err: unknown) {
        status.services.push({ name: 'Sigma Conversion API', url: SIGMA_API_URL, status: 'down', latency_ms: null, last_checked: nowIso() });
        status.errors.push({ type: 'api-error', title: 'Conversion API Unreachable', detail: err instanceof Error ? err.message : String(err) });
      }

      try {
        const health = await (client as any).cluster.health();
        const info = await (client as any).info();
        status.services.push({ name: 'Elasticsearch', status: 'ok', latency_ms: null, last_checked: nowIso(), cluster: health, info });
      } catch (err: unknown) {
        status.services.push({ name: 'Elasticsearch', status: 'down', latency_ms: null, last_checked: nowIso() });
        status.errors.push({ type: 'elasticsearch-error', title: 'Elasticsearch Unreachable', detail: err instanceof Error ? err.message : String(err) });
      }

      return response.ok({ body: status });
    }
  );
}
