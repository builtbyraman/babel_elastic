import { registerSigmaTestRunRoute } from './sigma_test_run';

function makeRouter() {
  const routes: Array<{ method: string; path: string; handler: Function }> = [];
  const router = {
    get:    (cfg: any, h: any) => routes.push({ method: 'get',    path: cfg.path, handler: h }),
    post:   (cfg: any, h: any) => routes.push({ method: 'post',   path: cfg.path, handler: h }),
    put:    (cfg: any, h: any) => routes.push({ method: 'put',    path: cfg.path, handler: h }),
    delete: (cfg: any, h: any) => routes.push({ method: 'delete', path: cfg.path, handler: h }),
  };
  const get = (method: string, path: string) =>
    routes.find(r => r.method === method && r.path === path)?.handler;
  return { router, get };
}

function makeResponse() {
  return {
    ok:            jest.fn((o: any) => ({ type: 'ok', ...o })),
    badRequest:    jest.fn((o: any) => ({ type: 'badRequest', ...o })),
    internalError: jest.fn((o: any) => ({ type: 'internalError', ...o })),
    customError:   jest.fn((o: any) => ({ type: 'customError', ...o })),
    notFound:      jest.fn((o: any) => ({ type: 'notFound', ...o })),
    forbidden:     jest.fn((o: any) => ({ type: 'forbidden', ...o })),
  };
}

const CONFIG = { sigmaApiUrl: 'http://sigma-api:8001/v1' };
const RULE_YAML = 'title: Test\nstatus: test\n';

describe('sigma_test_run route', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('registers POST /api/babel/test-run', () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);
    expect(get('post', '/api/babel/test-run')).toBeDefined();
  });

  it('registers POST /api/babel/cluster-hits/{testRunId}', () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);
    expect(get('post', '/api/babel/cluster-hits/{testRunId}')).toBeDefined();
  });

  it('proxies test-run to sigma API and wraps result', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    const apiResult = {
      test_run_id: 'run-abc',
      hit_count: 5,
      sample_events: [],
      timing_ms: 120,
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResult,
    });

    const response = makeResponse();
    await get('post', '/api/babel/test-run')(null, {
      body: {
        ruleYaml: RULE_YAML,
        indexPattern: 'winlogbeat-*',
        timeframeHours: 24,
        pipeline: 'ecs_windows',
        queryFormat: 'eql',
      },
    }, response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const body = response.ok.mock.calls[0][0].body;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(apiResult);
  });

  it('forwards correct fields to sigma API test-runs endpoint', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ test_run_id: 'r', hit_count: 0, sample_events: [], timing_ms: 50 }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/test-run')(null, {
      body: {
        ruleYaml: RULE_YAML,
        indexPattern: 'logs-*',
        timeframeHours: 48,
        pipeline: 'ecs_linux',
        queryFormat: 'esql',
      },
    }, response);

    expect(fetchSpy.mock.calls[0][0]).toBe('http://sigma-api:8001/v1/test-runs');
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.rule_yaml).toBe(RULE_YAML);
    expect(sentBody.index_pattern).toBe('logs-*');
    expect(sentBody.timeframe_hours).toBe(48);
    expect(sentBody.pipeline).toBe('ecs_linux');
    expect(sentBody.query_format).toBe('esql');
  });

  it('returns customError when sigma API test-run fails', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid query format for rule' }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/test-run')(null, {
      body: { ruleYaml: RULE_YAML, indexPattern: '*', timeframeHours: 24, pipeline: 'ecs_windows', queryFormat: 'eql' },
    }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('proxies cluster-hits to sigma API with correct test run ID', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    const clusterResult = {
      test_run_id: 'run-abc',
      total_hits: 10,
      clusters: [{ field: 'process.name', buckets: [{ value: 'cmd.exe', count: 8 }] }],
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => clusterResult,
    });

    const response = makeResponse();
    await get('post', '/api/babel/cluster-hits/{testRunId}')(null, {
      params: { testRunId: 'run-abc' },
      body: { topN: 5 },
    }, response);

    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://sigma-api:8001/v1/test-runs/run-abc/cluster-hits?top_n=5'
    );
    expect(response.ok.mock.calls[0][0].body.success).toBe(true);
    expect(response.ok.mock.calls[0][0].body.data).toEqual(clusterResult);
  });

  it('URL-encodes test run ID in cluster-hits request', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ test_run_id: 'id with spaces', total_hits: 0, clusters: [] }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/cluster-hits/{testRunId}')(null, {
      params: { testRunId: 'id with spaces' },
      body: { topN: 3 },
    }, response);

    expect(fetchSpy.mock.calls[0][0]).toContain('id%20with%20spaces');
  });

  it('returns internalError when fetch throws for test-run', async () => {
    const { router, get } = makeRouter();
    registerSigmaTestRunRoute(router as any, CONFIG);

    fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

    const response = makeResponse();
    await get('post', '/api/babel/test-run')(null, {
      body: { ruleYaml: RULE_YAML, indexPattern: '*', timeframeHours: 24, pipeline: 'ecs_windows', queryFormat: 'eql' },
    }, response);

    expect(response.internalError).toHaveBeenCalledTimes(1);
  });
});
