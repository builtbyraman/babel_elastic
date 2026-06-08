import { registerSigmaTranslationRoute } from './sigma_translation';

// ── helpers ───────────────────────────────────────────────────────────────────

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
    ok:          jest.fn((o: any) => ({ type: 'ok', ...o })),
    badRequest:  jest.fn((o: any) => ({ type: 'badRequest', ...o })),
    internalError: jest.fn((o: any) => ({ type: 'internalError', ...o })),
    customError: jest.fn((o: any) => ({ type: 'customError', ...o })),
    notFound:    jest.fn((o: any) => ({ type: 'notFound', ...o })),
    forbidden:   jest.fn((o: any) => ({ type: 'forbidden', ...o })),
  };
}

function b64(s: string): string {
  return Buffer.from(s).toString('base64');
}

const CONFIG = { sigmaApiUrl: 'http://sigma-api:8001/v1' };
const RULE_YAML = 'title: Test\nstatus: test\n';

// ── tests ─────────────────────────────────────────────────────────────────────

describe('sigma_translation route', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('registers GET /api/babel/sigma-translation', () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);
    expect(get('get', '/api/babel/sigma-translation')).toBeDefined();
  });

  it('proxies YAML to sigma API and returns base64-encoded result', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query_result: 'process.name: "cmd.exe"', format: 'es-qs' }),
    });

    const response = makeResponse();
    const request = {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'es-qs', pipeline: 'ecs_windows' },
    };

    await get('get', '/api/babel/sigma-translation')(null, request, response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const call = response.ok.mock.calls[0][0];
    expect(call.body.success).toBe(true);
    // translation must be base64
    expect(Buffer.from(call.body.data.translation, 'base64').toString()).toBe(
      'process.name: "cmd.exe"'
    );
  });

  it('forwards correct body to sigma API', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query_result: 'SELECT * FROM processes', format: 'esql' }),
    });

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'esql', pipeline: 'ecs_linux' },
    }, response);

    const fetchCall = fetchSpy.mock.calls[0];
    expect(fetchCall[0]).toBe('http://sigma-api:8001/v1/conversions');
    const body = JSON.parse(fetchCall[1].body);
    expect(body.rule_yaml).toBe(RULE_YAML);
    expect(body.format).toBe('esql');
    expect(body.pipeline).toBe('ecs_linux');
  });

  it('decodes gracefully on malformed base64 (Node.js does not throw)', async () => {
    // Node.js Buffer.from(x, 'base64') never throws — it silently strips invalid
    // characters. The garbled YAML then gets forwarded to the sigma API.
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Invalid YAML' }),
    });

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: '!!!not-base64-at-all!!!', siemTo: 'es-qs' },
    }, response);

    // The fetch was still attempted (no early badRequest) and a customError is returned
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422 })
    );
  });

  it('returns customError when sigma API returns non-200', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Unsupported rule format' }),
    });

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'es-qs' },
    }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422 })
    );
  });

  it('returns internalError when fetch throws', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'es-qs' },
    }, response);

    expect(response.internalError).toHaveBeenCalledTimes(1);
    expect(response.internalError.mock.calls[0][0].body.message).toContain('Connection refused');
  });

  it('defaults pipeline to ecs_windows when not provided', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query_result: 'result' }),
    });

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'es-qs' },
    }, response);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.pipeline).toBe('ecs_windows');
  });

  it('handles empty query_result gracefully', async () => {
    const { router, get } = makeRouter();
    registerSigmaTranslationRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query_result: '' }),
    });

    const response = makeResponse();
    await get('get', '/api/babel/sigma-translation')(null, {
      query: { sigmaText: b64(RULE_YAML), siemTo: 'es-qs' },
    }, response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    // empty string encodes to empty base64
    const decoded = Buffer.from(response.ok.mock.calls[0][0].body.data.translation, 'base64').toString();
    expect(decoded).toBe('');
  });
});
