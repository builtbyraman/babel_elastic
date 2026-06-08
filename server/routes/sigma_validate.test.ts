import { registerSigmaValidateRoute } from './sigma_validate';

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
const VALID_RULE = 'title: Test\nstatus: test\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CommandLine: test\n  condition: selection\n';

describe('sigma_validate route', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('registers POST /api/babel/validate', () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);
    expect(get('post', '/api/babel/validate')).toBeDefined();
  });

  it('returns validation result from sigma API on success', async () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);

    const apiResponse = { valid: true, issues: [] };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    const response = makeResponse();
    await get('post', '/api/babel/validate')(null, {
      body: { ruleYaml: VALID_RULE },
    }, response);

    expect(response.ok).toHaveBeenCalledWith({ body: apiResponse });
  });

  it('forwards ruleYaml as rule_yaml to sigma API', async () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, issues: [] }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/validate')(null, {
      body: { ruleYaml: VALID_RULE },
    }, response);

    expect(fetchSpy.mock.calls[0][0]).toBe('http://sigma-api:8001/v1/rules/validate');
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.rule_yaml).toBe(VALID_RULE);
  });

  it('returns validation errors from sigma API', async () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);

    const apiResponse = {
      valid: false,
      issues: [{ type: 'error', rule: 'required_field', message: 'Missing required field: detection' }],
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    const response = makeResponse();
    await get('post', '/api/babel/validate')(null, {
      body: { ruleYaml: 'title: Bad\n' },
    }, response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const body = response.ok.mock.calls[0][0].body;
    expect(body.valid).toBe(false);
    expect(body.issues).toHaveLength(1);
    expect(body.issues[0].type).toBe('error');
  });

  it('returns customError when sigma API rejects with 422', async () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Invalid YAML structure' }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/validate')(null, {
      body: { ruleYaml: 'invalid: yaml: :' },
    }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422 })
    );
  });

  it('returns internalError when fetch throws', async () => {
    const { router, get } = makeRouter();
    registerSigmaValidateRoute(router as any, CONFIG);

    fetchSpy.mockRejectedValueOnce(new Error('Network timeout'));

    const response = makeResponse();
    await get('post', '/api/babel/validate')(null, {
      body: { ruleYaml: VALID_RULE },
    }, response);

    expect(response.internalError).toHaveBeenCalledTimes(1);
    expect(response.internalError.mock.calls[0][0].body.message).toContain('Network timeout');
  });
});
