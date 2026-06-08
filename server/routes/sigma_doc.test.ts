import { registerSigmaDocRoute } from './sigma_doc';

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

function makeEsClient(hits: unknown[], total = hits.length) {
  return {
    search: jest.fn().mockResolvedValue({
      hits: {
        total: { value: total },
        hits: hits.map((src, i) => ({ _id: `id-${i}`, _source: src })),
      },
    }),
  };
}

function makeContext(esClient: ReturnType<typeof makeEsClient>) {
  return {
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser: esClient } },
    }),
  };
}

describe('sigma_doc route', () => {
  it('registers GET /api/babel/sigma-doc', () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);
    expect(get('get', '/api/babel/sigma-doc')).toBeDefined();
  });

  it('returns all docs with match_all when no filters provided', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const docs = [
      { title: 'Rule A', tags: ['attack.execution'] },
      { title: 'Rule B', tags: ['attack.persistence'] },
    ];
    const esClient = makeEsClient(docs);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: {} },
      response
    );

    expect(response.ok).toHaveBeenCalledTimes(1);
    const body = response.ok.mock.calls[0][0].body;
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(2);
    expect(body.data.docs).toHaveLength(2);

    const searchCall = esClient.search.mock.calls[0][0];
    expect(searchCall.query).toEqual({ match_all: {} });
  });

  it('applies text search filter', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([{ title: 'PowerShell Exec' }]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { search: 'powershell' } },
      response
    );

    const searchCall = esClient.search.mock.calls[0][0];
    const must = searchCall.query.bool.must;
    expect(must.some((c: any) => c.multi_match?.query === 'powershell')).toBe(true);
  });

  it('applies mitre tactic filter with attack. prefix', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { mitre: 'execution' } },
      response
    );

    const must = esClient.search.mock.calls[0][0].query.bool.must;
    expect(must.some((c: any) => c.term?.['tags.keyword'] === 'attack.execution')).toBe(true);
  });

  it('applies irPhase filter (new feature)', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([{ title: 'Detection Rule', 'x-ir-phase': 'detection' }]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { irPhase: 'detection' } },
      response
    );

    const must = esClient.search.mock.calls[0][0].query.bool.must;
    expect(must.some((c: any) => c.term?.['x-ir-phase'] === 'detection')).toBe(true);
  });

  it('applies all filters simultaneously', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { search: 'lsass', mitre: 'credential-access', irPhase: 'containment', category: 'process_creation' } },
      response
    );

    const must = esClient.search.mock.calls[0][0].query.bool.must;
    expect(must).toHaveLength(4); // search + mitre + irPhase + category
  });

  it('sanitises search input to prevent injection', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { search: '<script>alert(1)</script>' } },
      response
    );

    const must = esClient.search.mock.calls[0][0].query.bool.must;
    const query = must[0].multi_match.query;
    expect(query).not.toContain('<');
    expect(query).not.toContain('>');
  });

  it('sanitises irPhase — strips special chars (semicolons, spaces, numbers)', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([]);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { irPhase: 'detection; DROP TABLE rules;' } },
      response
    );

    const must = esClient.search.mock.calls[0][0].query.bool.must;
    const termValue = must[0].term['x-ir-phase'];
    // Semicolons, spaces, and digits must be stripped
    expect(termValue).not.toContain(';');
    expect(termValue).not.toContain(' ');
    // Only letters and hyphens remain (case-insensitive strip of non-[a-z-])
    expect(termValue).toMatch(/^[a-zA-Z-]+$/);
  });

  it('returns internalError when Elasticsearch throws', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('ES cluster unavailable')),
    };
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: {} },
      response
    );

    expect(response.internalError).toHaveBeenCalledTimes(1);
    expect(response.internalError.mock.calls[0][0].body.message).toContain('ES cluster unavailable');
  });

  it('respects from and size pagination params', async () => {
    const { router, get } = makeRouter();
    registerSigmaDocRoute(router as any);

    const esClient = makeEsClient([], 100);
    const response = makeResponse();

    await get('get', '/api/babel/sigma-doc')(
      makeContext(esClient),
      { query: { from: 40, size: 10 } },
      response
    );

    const searchCall = esClient.search.mock.calls[0][0];
    expect(searchCall.from).toBe(40);
    expect(searchCall.size).toBe(10);
  });
});
