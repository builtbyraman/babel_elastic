import React, { useState, useMemo, useCallback } from 'react';
import { EuiProvider, EuiGlobalToastList } from '@elastic/eui';
import { TopNav } from './TopNav';
import { MainLayout } from './MainLayout';
import { RuleSelector } from './RuleSelector';
import { SettingsModal } from './SettingsModal';
import { PosturePage } from './PosturePage';
import { useEditorSync } from '../hooks/useEditorSync';
import { useConversion } from '../hooks/useConversion';
import { useKibana } from '../context/KibanaContext';
import { createApiService } from '../services/api';
import { TestRunResult, DeployResult, ClusterHitsResult } from '../types';

interface Toast {
  id: string;
  title: string;
  color: 'success' | 'danger' | 'warning' | 'primary';
  iconType: string;
  toastLifeTimeMs?: number;
}

const DEFAULT_RULE = `title: New SIGMA Rule
status: experimental
description: ''
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: ''
    condition: selection
level: medium
`;

export const App: React.FC = () => {
  const { http } = useKibana();
  const apiService = useMemo(() => createApiService(http), [http]);

  const [{ yaml, rule, parseError }, { setYaml, updateRule }] = useEditorSync(DEFAULT_RULE);
  const [view, setView] = useState<'editor' | 'coverage'>('editor');
  const [showRuleSelector, setShowRuleSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conversionFormat, setConversionFormat] = useState('es-qs');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Backtest state
  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Deploy state
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // Cluster-hits state
  const [clusterHitsResult, setClusterHitsResult] = useState<ClusterHitsResult | null>(null);
  const [clusterHitsError, setClusterHitsError] = useState<string | null>(null);
  const [isClusteringHits, setIsClusteringHits] = useState(false);

  const { result: conversionResult, error: conversionError, isConverting, pipeline: conversionPipeline } =
    useConversion(yaml, rule, conversionFormat, apiService);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: String(Date.now()) }]);
  }, []);

  const removeToast = useCallback(({ id }: { id: string }) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSyncRules = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await apiService.syncFromGitHub();
      if (res.success) {
        const synced = res.synced ?? 0;
        const found = res.total_found;
        const detail = found != null && found > synced
          ? `${synced} of ${found} rules indexed`
          : `${synced} rules indexed`;
        const color = synced > 0 ? 'success' : 'warning';
        addToast({
          title: res.message ?? detail,
          color,
          iconType: color === 'success' ? 'check' : 'warning',
          toastLifeTimeMs: 10000,
        });
      } else {
        addToast({ title: res.message ?? 'Sync failed', color: 'danger', iconType: 'error', toastLifeTimeMs: 10000 });
      }
    } catch (e) {
      addToast({ title: e instanceof Error ? e.message : 'Sync failed', color: 'danger', iconType: 'error', toastLifeTimeMs: 10000 });
    } finally {
      setIsSyncing(false);
    }
  }, [apiService, addToast]);

  const handleTestRun = useCallback(async ({ indexPattern, timeframeHours }: { indexPattern: string; timeframeHours: number }) => {
    setIsTestRunning(true);
    setTestRunResult(null);
    setTestRunError(null);
    try {
      const res = await apiService.testRule({
        ruleYaml: yaml,
        indexPattern,
        timeframeHours,
        pipeline: conversionPipeline,
        queryFormat: conversionFormat,
      });
      if (res.success && res.data) {
        setTestRunResult(res.data);
      } else {
        setTestRunError(res.message ?? 'Test run failed');
      }
    } catch (e) {
      setTestRunError(e instanceof Error ? e.message : 'Test run failed');
    } finally {
      setIsTestRunning(false);
    }
  }, [apiService, yaml, conversionPipeline, conversionFormat]);

  const handleClusterHits = useCallback(async (testRunId: string) => {
    setIsClusteringHits(true);
    setClusterHitsResult(null);
    setClusterHitsError(null);
    try {
      const res = await apiService.clusterHits(testRunId);
      if (res.success && res.data) {
        setClusterHitsResult(res.data);
      } else {
        setClusterHitsError(res.message ?? 'Cluster hits failed');
      }
    } catch (e) {
      setClusterHitsError(e instanceof Error ? e.message : 'Cluster hits failed');
    } finally {
      setIsClusteringHits(false);
    }
  }, [apiService]);

  const handleDeploy = useCallback(async ({ schedule, enabled }: { schedule?: string; enabled: boolean }) => {
    setIsDeploying(true);
    setDeployResult(null);
    setDeployError(null);
    try {
      const res = await apiService.deployRule({
        ruleYaml: yaml,
        format: conversionFormat,
        pipeline: conversionPipeline,
        schedule,
        enabled,
      });
      if (res.success && res.data) {
        setDeployResult(res.data);
        addToast({ title: `Rule "${res.data.name}" created in Elastic Security`, color: 'success', iconType: 'check' });
      } else {
        setDeployError(res.message ?? 'Deploy failed');
      }
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : 'Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  }, [apiService, yaml, conversionFormat, conversionPipeline, addToast]);

  return (
    <EuiProvider>
      <TopNav
        onNewRule={() => { setView('editor'); setYaml(DEFAULT_RULE); }}
        onSelectRule={() => { setView('editor'); setShowRuleSelector(true); }}
        onSyncRules={handleSyncRules}
        onOpenSettings={() => setShowSettings(true)}
        onOpenCoverage={() => setView(v => v === 'coverage' ? 'editor' : 'coverage')}
        isSyncing={isSyncing}
        coverageActive={view === 'coverage'}
      />

      {view === 'coverage' && (
        <PosturePage apiService={apiService} />
      )}

      {view === 'editor' && (
        <MainLayout
          sigmaYaml={yaml}
          parsedRule={rule}
          parseError={parseError}
          onYamlChange={setYaml}
          onRuleChange={updateRule}
          isLoading={false}
          conversionFormat={conversionFormat}
          onConversionFormatChange={setConversionFormat}
          conversionResult={conversionResult}
          conversionError={conversionError}
          isConverting={isConverting}
          conversionPipeline={conversionPipeline}
          onTestRun={handleTestRun}
          testRunResult={testRunResult}
          testRunError={testRunError}
          isTestRunning={isTestRunning}
          onDeploy={handleDeploy}
          deployResult={deployResult}
          deployError={deployError}
          isDeploying={isDeploying}
          clusterHitsResult={clusterHitsResult}
          clusterHitsError={clusterHitsError}
          isClusteringHits={isClusteringHits}
          onClusterHits={handleClusterHits}
          apiService={apiService}
        />
      )}

      {showRuleSelector && (
        <RuleSelector
          onClose={() => setShowRuleSelector(false)}
          onSelect={setYaml}
          apiService={apiService}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          apiService={apiService}
        />
      )}

      <EuiGlobalToastList
        toasts={toasts as any}
        dismissToast={removeToast as any}
        toastLifeTimeMs={5000}
      />
    </EuiProvider>
  );
};
