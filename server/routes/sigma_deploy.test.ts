import { registerSigmaDeployRoute } from './sigma_deploy';

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

const RULE_YAML = `title: PowerShell Execution
description: Detects PowerShell execution
level: high
status: test
tags:
  - attack.execution
  - attack.t1059.001
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains: powershell
  condition: selection
`;

describe('sigma_deploy route', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('registers POST /api/babel/deploy', () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);
    expect(get('post', '/api/babel/deploy')).toBeDefined();
  });

  it('rejects unsupported formats with badRequest', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'kibana_ndjson', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(response.badRequest.mock.calls[0][0].body.message).toContain('kibana_ndjson');
  });

  it('maps high severity to correct Elastic risk_score (73)', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    // Step 1: sigma API conversion
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query_result: 'process.name: "powershell.exe"' }),
    });
    // Step 2: Kibana Detection Engine
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rule-123', name: 'PowerShell Execution', enabled: false, created_at: '2024-01-01' }),
    });
    // Step 3: rule registry (fire-and-forget)
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    expect(response.ok.mock.calls[0][0].body.success).toBe(true);

    // Verify Kibana rule payload has correct severity mapping
    const kibanaCall = fetchSpy.mock.calls[1];
    const kibanaBody = JSON.parse(kibanaCall[1].body);
    expect(kibanaBody.severity).toBe('high');
    expect(kibanaBody.risk_score).toBe(73);
  });

  it('maps critical severity to risk_score 99', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    const criticalRule = RULE_YAML.replace('level: high', 'level: critical');

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: criticalRule, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.severity).toBe('critical');
    expect(kibanaBody.risk_score).toBe(99);
  });

  it('maps low severity to risk_score 21', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    const lowRule = RULE_YAML.replace('level: high', 'level: low');

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: lowRule, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.severity).toBe('low');
    expect(kibanaBody.risk_score).toBe(21);
  });

  it('defaults unknown severity level to medium (risk_score 47)', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    const unknownLevelRule = RULE_YAML.replace('level: high', 'level: unknown_level');

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: unknownLevelRule, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.severity).toBe('medium');
    expect(kibanaBody.risk_score).toBe(47);
  });

  it('strips attack. tags from rule tags but keeps non-attack tags', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    // Build YAML with a proper tags array including both attack and non-attack tags
    const mixedTagsRule = `title: Mixed Tags Rule
description: test
level: high
status: test
tags:
  - attack.execution
  - attack.t1059.001
  - detection.emerging_threats
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains: powershell
  condition: selection
`;

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: mixedTagsRule, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    // attack. tags should not be in kibana tags
    expect(kibanaBody.tags).not.toContain('attack.execution');
    expect(kibanaBody.tags).not.toContain('attack.t1059.001');
    // non-attack tags should be kept
    expect(kibanaBody.tags).toContain('detection.emerging_threats');
  });

  it('builds MITRE threat array from attack.t tags', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(Array.isArray(kibanaBody.threat)).toBe(true);
    expect(kibanaBody.threat.length).toBeGreaterThan(0);
    const threat = kibanaBody.threat[0];
    expect(threat.framework).toBe('MITRE ATT&CK');
    const techniques: string[] = threat.technique.map((t: any) => t.id);
    expect(techniques).toContain('T1059.001');
  });

  it('produces empty threat array when no attack. technique tags', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    const noAttackRule = `title: Simple Rule\nlevel: medium\nstatus: test\ntags:\n  - custom.tag\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CommandLine: test\n  condition: selection\n`;

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: noAttackRule, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.threat).toEqual([]);
  });

  it('uses eql rule type for eql format', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.type).toBe('eql');
    expect(kibanaBody.language).toBe('eql');
  });

  it('uses query/lucene rule type for es-qs format', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r', name: 'test', enabled: false, created_at: '' }),
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'es-qs', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    const kibanaBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(kibanaBody.type).toBe('query');
    expect(kibanaBody.language).toBe('lucene');
  });

  it('returns customError when sigma API conversion fails', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Cannot convert rule: unsupported logsource' }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422 })
    );
  });

  it('returns customError when Kibana Detection Engine rejects the rule', async () => {
    const { router, get } = makeRouter();
    registerSigmaDeployRoute(router as any, CONFIG);

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ query_result: 'query' }) });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Rule with this name already exists' }),
    });

    const response = makeResponse();
    await get('post', '/api/babel/deploy')(null, {
      body: { ruleYaml: RULE_YAML, format: 'eql', pipeline: 'ecs_windows', enabled: false },
      headers: {},
    }, response);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 })
    );
  });
});
