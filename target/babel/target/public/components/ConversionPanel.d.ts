import React from 'react';
import { TestRunResult, DeployResult, ClusterHitsResult } from '../types';
interface ConversionPanelProps {
    format: string;
    onFormatChange: (format: string) => void;
    result: string | null;
    error: string | null;
    isConverting: boolean;
    pipeline: string;
    hasRule: boolean;
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
}
export declare const ConversionPanel: React.FC<ConversionPanelProps>;
export {};
