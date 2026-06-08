import { HttpService } from '../context/KibanaContext';
import { TestRunResult, DeployResult, ValidationResult, FieldSuggestion, ClusterHitsResult, CoverageResult, QualityScoreResult } from '../types';
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
    data?: {
        repos: SigmaRepo[];
    };
    message?: string;
}
export interface SigmaDocResult {
    success: boolean;
    data?: {
        total: number;
        docs: Array<Record<string, unknown>>;
    };
}
export interface TranslationResult {
    success: boolean;
    data?: {
        translation: string;
    };
    message?: string;
}
export interface GitHubTokenResult {
    success: boolean;
    data?: {
        apiKey: string;
    };
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
export declare function createApiService(http: HttpService): {
    searchRules(params: {
        search?: string;
        category?: string;
        mitre?: string;
        irPhase?: string;
        from?: number;
        size?: number;
    }): Promise<SigmaDocResult>;
    translateRule(sigmaYaml: string, siemTo: string, pipeline?: string): Promise<TranslationResult>;
    addWatcher(watcherName: string, query: string, indexId?: string): Promise<unknown>;
    getGitHubToken(): Promise<GitHubTokenResult>;
    setGitHubToken(token: string): Promise<unknown>;
    syncFromGitHub(options?: {
        githubToken?: string;
        category?: string;
        limit?: number;
    }): Promise<SyncResult>;
    getRepos(): Promise<ReposResult>;
    saveRepos(repos: SigmaRepo[]): Promise<{
        success: boolean;
    }>;
    testRule(params: {
        ruleYaml: string;
        indexPattern?: string;
        timeframeHours?: number;
        pipeline?: string;
        queryFormat?: string;
    }): Promise<{
        success: boolean;
        data?: TestRunResult;
        message?: string;
    }>;
    deployRule(params: {
        ruleYaml: string;
        format: string;
        pipeline: string;
        schedule?: string;
        enabled?: boolean;
    }): Promise<{
        success: boolean;
        data?: DeployResult;
        message?: string;
    }>;
    getStatus(): Promise<unknown>;
    validateRule(ruleYaml: string): Promise<ValidationResult>;
    getFields(category?: string): Promise<Record<string, unknown>>;
    suggestField(sigmaField: string): Promise<FieldSuggestion>;
    clusterHits(testRunId: string, topN?: number): Promise<{
        success: boolean;
        data?: ClusterHitsResult;
        message?: string;
    }>;
    computeCoverage(ruleYamls: string[]): Promise<CoverageResult>;
    navigatorExport(ruleYamls: string[]): Promise<Record<string, unknown>>;
    irReadiness(scenario: string, ruleYamls: string[]): Promise<Record<string, unknown>>;
    getRuleQuality(ruleYaml: string): Promise<QualityScoreResult>;
    getDataSources(): Promise<{
        sources: DataSource[];
    }>;
};
export type ApiService = ReturnType<typeof createApiService>;
