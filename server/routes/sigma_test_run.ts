import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginConfig } from '../config';

const SIGMA_API_KEY = process.env.SIGMA_API_KEY || '';

function authHeaders(): Record<string, string> {
  return SIGMA_API_KEY ? { authorization: `Bearer ${SIGMA_API_KEY}` } : {};
}

export function registerSigmaTestRunRoute(router: IRouter, config: PluginConfig): void {
  const SIGMA_API_URL = config.sigmaApiUrl;
  router.post(
    {
      path: '/api/babel/test-run',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Authorization delegated to Elasticsearch via asCurrentUser' } },
      validate: {
        body: schema.object({
          ruleYaml: schema.string(),
          indexPattern: schema.string({ defaultValue: '*' }),
          timeframeHours: schema.number({ defaultValue: 24, min: 1, max: 2160 }),
          pipeline: schema.string({ defaultValue: 'ecs_windows' }),
          queryFormat: schema.string({ defaultValue: 'eql' }),
        }),
      },
    },
    async (_context, request, response) => {
      const { ruleYaml, indexPattern, timeframeHours, pipeline, queryFormat } = request.body as {
        ruleYaml: string;
        indexPattern: string;
        timeframeHours: number;
        pipeline: string;
        queryFormat: string;
      };

      try {
        const fetchRes = await fetch(`${SIGMA_API_URL}/test-runs`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            rule_yaml: ruleYaml,
            index_pattern: indexPattern,
            timeframe_hours: timeframeHours,
            pipeline,
            query_format: queryFormat,
          }),
        });

        const payload = await fetchRes.json().catch(() => null);

        if (!fetchRes.ok) {
          const message = payload?.detail ?? `Test run failed: ${fetchRes.status}`;
          return response.customError({ statusCode: fetchRes.status, body: { message } });
        }

        return response.ok({ body: { success: true, data: payload } });
      } catch (err: unknown) {
        return response.internalError({
          body: { message: err instanceof Error ? err.message : 'Test run failed' },
        });
      }
    }
  );

  router.post(
    {
      path: '/api/babel/cluster-hits/{testRunId}',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Reads cached test results, no user-privileged data' } },
      validate: {
        params: schema.object({ testRunId: schema.string() }),
        body: schema.object({ topN: schema.number({ defaultValue: 5, min: 1, max: 20 }) }),
      },
    },
    async (_context, request, response) => {
      const { testRunId } = request.params as { testRunId: string };
      const { topN } = request.body as { topN: number };

      try {
        const fetchRes = await fetch(
          `${SIGMA_API_URL}/test-runs/${encodeURIComponent(testRunId)}/cluster-hits?top_n=${topN}`,
          { method: 'POST', headers: authHeaders() }
        );
        const payload = await fetchRes.json().catch(() => null);
        if (!fetchRes.ok) {
          return response.customError({ statusCode: fetchRes.status, body: { message: payload?.detail ?? 'Cluster-hits failed' } });
        }
        return response.ok({ body: { success: true, data: payload } });
      } catch (err: unknown) {
        const _msg = err instanceof Error ? err.message : 'Cluster-hits failed';
        if (err instanceof TypeError) return response.customError({ statusCode: 503, body: { message: `Sigma API unreachable: ${_msg}` } });
        return response.internalError({ body: { message: _msg } });
      }
    }
  );
}
