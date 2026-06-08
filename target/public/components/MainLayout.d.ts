import React from 'react';
import { SigmaRule, TestRunResult, DeployResult, ClusterHitsResult } from '../types';
import { ApiService } from '../services/api';
interface MainLayoutProps {
    sigmaYaml: string;
    parsedRule: SigmaRule | null;
    parseError: string | null;
    onYamlChange: (yaml: string) => void;
    onRuleChange: (patch: Partial<SigmaRule>) => void;
    isLoading: boolean;
    conversionFormat: string;
    onConversionFormatChange: (format: string) => void;
    conversionResult: string | null;
    conversionError: string | null;
    isConverting: boolean;
    conversionPipeline: string;
    onTestRun: (params: {
        indexPattern: string;
        timeframeHours: number;
    }) => void;
    testRunResult: TestRunResult | null;
    testRunError: string | null;
    isTestRunning: boolean;
    onDeploy: (params: {
        schedule?: string;
        enabled: boolean;
    }) => void;
    deployResult: DeployResult | null;
    deployError: string | null;
    isDeploying: boolean;
    clusterHitsResult: ClusterHitsResult | null;
    clusterHitsError: string | null;
    isClusteringHits: boolean;
    onClusterHits: (testRunId: string) => void;
    apiService: ApiService;
}
export declare const MainLayout: React.FC<MainLayoutProps>;
export {};
