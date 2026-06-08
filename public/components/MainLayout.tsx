import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SigmaRule, TestRunResult, DeployResult, ClusterHitsResult } from '../types';
import { YamlEditor } from './YamlEditor';
import { VisualEditor } from './VisualEditor';
import { ConversionPanel } from './ConversionPanel';
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
  onTestRun: (params: { indexPattern: string; timeframeHours: number }) => void;
  testRunResult: TestRunResult | null;
  testRunError: string | null;
  isTestRunning: boolean;
  onDeploy: (params: { schedule?: string; enabled: boolean }) => void;
  deployResult: DeployResult | null;
  deployError: string | null;
  isDeploying: boolean;
  clusterHitsResult: ClusterHitsResult | null;
  clusterHitsError: string | null;
  isClusteringHits: boolean;
  onClusterHits: (testRunId: string) => void;
  apiService: ApiService;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  sigmaYaml,
  parsedRule,
  parseError,
  onYamlChange,
  onRuleChange,
  isLoading,
  conversionFormat,
  onConversionFormatChange,
  conversionResult,
  conversionError,
  isConverting,
  conversionPipeline,
  onTestRun,
  testRunResult,
  testRunError,
  isTestRunning,
  onDeploy,
  deployResult,
  deployError,
  isDeploying,
  clusterHitsResult,
  clusterHitsError,
  isClusteringHits,
  onClusterHits,
  apiService,
}) => {
  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '80vh' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="m"
      style={{ height: 'calc(100vh - 96px)', padding: '12px', marginTop: '48px' }}
    >
      <EuiFlexItem grow={4}>
        <YamlEditor
          value={sigmaYaml}
          onChange={onYamlChange}
          parseError={parseError}
          apiService={apiService}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        <VisualEditor
          rule={parsedRule}
          onChange={onRuleChange}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        <ConversionPanel
          format={conversionFormat}
          onFormatChange={onConversionFormatChange}
          result={conversionResult}
          error={conversionError}
          isConverting={isConverting}
          pipeline={conversionPipeline}
          hasRule={parsedRule !== null}
          onTestRun={onTestRun}
          testRunResult={testRunResult}
          testRunError={testRunError}
          isTestRunning={isTestRunning}
          onDeploy={onDeploy}
          deployResult={deployResult}
          deployError={deployError}
          isDeploying={isDeploying}
          clusterHitsResult={clusterHitsResult}
          clusterHitsError={clusterHitsError}
          isClusteringHits={isClusteringHits}
          onClusterHits={onClusterHits}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
