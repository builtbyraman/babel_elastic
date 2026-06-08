import { HttpService } from '../context/KibanaContext';
import {
  TestRunResult, DeployResult, ValidationResult, FieldSuggestion, ClusterHitsResult, CoverageResult,
  QualityScoreResult,
} from '../types';

const BASE = '/api/babel';

export interface SigmaRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  rulesPath: string;
  enabled: boolean;
}

export interface ReposResult {
  success: boolean;
  data?: { repos: SigmaRepo[] };
  message?: string;
}

export interface SigmaDocResult {
  success: boolean;
  data?: { total: number; docs: Array<Record<string, unknown>> };
}

export interface TranslationResult {
  success: boolean;
  data?: { translation: string };
  message?: string;
}

export interface GitHubTokenResult {
  success: boolean;
  data?: { apiKey: string };
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  total_found?: number;
  message?: string;
}

export interface DataSource {
  product: string;
  label: string;
  available: boolean;
  index_count: number;
  doc_count: number;
  indices: string[];
  categories: string[];
}

export function createApiService(http: HttpService) {
  return {
    searchRules(params: { search?: string; category?: string; mitre?: string; irPhase?: string; from?: number; size?: number }) {
      return http.get<SigmaDocResult>(`${BASE}/sigma-doc`, {
        query: params as Record<string, unknown>,
      });
    },

    translateRule(sigmaYaml: string, siemTo: string, pipeline = 'ecs_windows') {
      const bytes = new TextEncoder().encode(sigmaYaml);
      const sigmaText = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
      return http.get<TranslationResult>(`${BASE}/sigma-translation`, {
        query: { sigmaText, siemTo, pipeline },
      });
    },

    addWatcher(watcherName: string, query: string, indexId?: string) {
      return http.post(`${BASE}/sigma-add-watcher`, {
        body: JSON.stringify({ watcherName, query, indexId }),
      });
    },

    getGitHubToken() {
      return http.post<GitHubTokenResult>(`${BASE}/get-tdm-api-key`);
    },

    setGitHubToken(token: string) {
      return http.post(`${BASE}/set-tdm-api-key`, {
        body: JSON.stringify({ apiKey: token }),
      });
    },

    syncFromGitHub(options?: { githubToken?: string; category?: string; limit?: number }) {
      return http.post<SyncResult>(`${BASE}/tdm-api-update-sigma`, {
        body: JSON.stringify(options ?? {}),
      });
    },

    getRepos() {
      return http.get<ReposResult>(`${BASE}/repos`);
    },

    saveRepos(repos: SigmaRepo[]) {
      return http.post<{ success: boolean }>(`${BASE}/repos`, {
        body: JSON.stringify({ repos }),
      });
    },

    testRule(params: {
      ruleYaml: string;
      indexPattern?: string;
      timeframeHours?: number;
      pipeline?: string;
      queryFormat?: string;
    }) {
      return http.post<{ success: boolean; data?: TestRunResult; message?: string }>(`${BASE}/test-run`, {
        body: JSON.stringify({
          ruleYaml: params.ruleYaml,
          indexPattern: params.indexPattern ?? '*',
          timeframeHours: params.timeframeHours ?? 24,
          pipeline: params.pipeline ?? 'ecs_windows',
          queryFormat: params.queryFormat ?? 'eql',
        }),
      });
    },

    deployRule(params: {
      ruleYaml: string;
      format: string;
      pipeline: string;
      schedule?: string;
      enabled?: boolean;
    }) {
      return http.post<{ success: boolean; data?: DeployResult; message?: string }>(`${BASE}/deploy`, {
        body: JSON.stringify({
          ruleYaml: params.ruleYaml,
          format: params.format,
          pipeline: params.pipeline,
          schedule: params.schedule,
          enabled: params.enabled ?? false,
        }),
      });
    },

    getStatus() {
      return http.get(`${BASE}/status`);
    },

    validateRule(ruleYaml: string) {
      return http.post<ValidationResult>(`${BASE}/validate`, {
        body: JSON.stringify({ ruleYaml }),
      });
    },

    getFields(category?: string) {
      return http.get<Record<string, unknown>>(`${BASE}/fields`, {
        query: category ? { category } : {},
      });
    },

    suggestField(sigmaField: string) {
      return http.post<FieldSuggestion>(`${BASE}/fields/suggest`, {
        body: JSON.stringify({ sigmaField }),
      });
    },

    clusterHits(testRunId: string, topN = 5) {
      return http.post<{ success: boolean; data?: ClusterHitsResult; message?: string }>(
        `${BASE}/cluster-hits/${encodeURIComponent(testRunId)}`,
        { body: JSON.stringify({ topN }) }
      );
    },

    computeCoverage(ruleYamls: string[]) {
      return http.post<CoverageResult>(`${BASE}/coverage`, {
        body: JSON.stringify({ ruleYamls }),
      });
    },

    navigatorExport(ruleYamls: string[]) {
      return http.post<Record<string, unknown>>(`${BASE}/coverage/navigator-export`, {
        body: JSON.stringify({ ruleYamls }),
      });
    },

    irReadiness(scenario: string, ruleYamls: string[]) {
      return http.post<Record<string, unknown>>(`${BASE}/ir-readiness`, {
        body: JSON.stringify({ scenario, ruleYamls }),
      });
    },

    getRuleQuality(ruleYaml: string) {
      return http.post<QualityScoreResult>(`${BASE}/rules/quality`, {
        body: JSON.stringify({ ruleYaml }),
      });
    },

    getDataSources() {
      return http.get<{ sources: DataSource[] }>(`${BASE}/data-sources`);
    },
  };
}

export type ApiService = ReturnType<typeof createApiService>;
