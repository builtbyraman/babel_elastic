"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const TopNav_1 = require("./TopNav");
const MainLayout_1 = require("./MainLayout");
const RuleSelector_1 = require("./RuleSelector");
const SettingsModal_1 = require("./SettingsModal");
const PosturePage_1 = require("./PosturePage");
const useEditorSync_1 = require("../hooks/useEditorSync");
const useConversion_1 = require("../hooks/useConversion");
const KibanaContext_1 = require("../context/KibanaContext");
const api_1 = require("../services/api");
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
const App = () => {
    const { http } = (0, KibanaContext_1.useKibana)();
    const apiService = (0, react_1.useMemo)(() => (0, api_1.createApiService)(http), [http]);
    const [{ yaml, rule, parseError }, { setYaml, updateRule }] = (0, useEditorSync_1.useEditorSync)(DEFAULT_RULE);
    const [view, setView] = (0, react_1.useState)('editor');
    const [showRuleSelector, setShowRuleSelector] = (0, react_1.useState)(false);
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    const [isSyncing, setIsSyncing] = (0, react_1.useState)(false);
    const [conversionFormat, setConversionFormat] = (0, react_1.useState)('es-qs');
    const [toasts, setToasts] = (0, react_1.useState)([]);
    // Backtest state
    const [testRunResult, setTestRunResult] = (0, react_1.useState)(null);
    const [testRunError, setTestRunError] = (0, react_1.useState)(null);
    const [isTestRunning, setIsTestRunning] = (0, react_1.useState)(false);
    // Deploy state
    const [deployResult, setDeployResult] = (0, react_1.useState)(null);
    const [deployError, setDeployError] = (0, react_1.useState)(null);
    const [isDeploying, setIsDeploying] = (0, react_1.useState)(false);
    // Cluster-hits state
    const [clusterHitsResult, setClusterHitsResult] = (0, react_1.useState)(null);
    const [clusterHitsError, setClusterHitsError] = (0, react_1.useState)(null);
    const [isClusteringHits, setIsClusteringHits] = (0, react_1.useState)(false);
    const { result: conversionResult, error: conversionError, isConverting, pipeline: conversionPipeline } = (0, useConversion_1.useConversion)(yaml, rule, conversionFormat, apiService);
    const addToast = (0, react_1.useCallback)((toast) => {
        setToasts(prev => [...prev, { ...toast, id: String(Date.now()) }]);
    }, []);
    const removeToast = (0, react_1.useCallback)(({ id }) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    const handleSyncRules = (0, react_1.useCallback)(async () => {
        var _a, _b, _c;
        setIsSyncing(true);
        try {
            const res = await apiService.syncFromGitHub();
            if (res.success) {
                const synced = (_a = res.synced) !== null && _a !== void 0 ? _a : 0;
                const found = res.total_found;
                const detail = found != null && found > synced
                    ? `${synced} of ${found} rules indexed`
                    : `${synced} rules indexed`;
                const color = synced > 0 ? 'success' : 'warning';
                addToast({
                    title: (_b = res.message) !== null && _b !== void 0 ? _b : detail,
                    color,
                    iconType: color === 'success' ? 'check' : 'warning',
                    toastLifeTimeMs: 10000,
                });
            }
            else {
                addToast({ title: (_c = res.message) !== null && _c !== void 0 ? _c : 'Sync failed', color: 'danger', iconType: 'error', toastLifeTimeMs: 10000 });
            }
        }
        catch (e) {
            addToast({ title: e instanceof Error ? e.message : 'Sync failed', color: 'danger', iconType: 'error', toastLifeTimeMs: 10000 });
        }
        finally {
            setIsSyncing(false);
        }
    }, [apiService, addToast]);
    const handleTestRun = (0, react_1.useCallback)(async ({ indexPattern, timeframeHours }) => {
        var _a;
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
            }
            else {
                setTestRunError((_a = res.message) !== null && _a !== void 0 ? _a : 'Test run failed');
            }
        }
        catch (e) {
            setTestRunError(e instanceof Error ? e.message : 'Test run failed');
        }
        finally {
            setIsTestRunning(false);
        }
    }, [apiService, yaml, conversionPipeline, conversionFormat]);
    const handleClusterHits = (0, react_1.useCallback)(async (testRunId) => {
        var _a;
        setIsClusteringHits(true);
        setClusterHitsResult(null);
        setClusterHitsError(null);
        try {
            const res = await apiService.clusterHits(testRunId);
            if (res.success && res.data) {
                setClusterHitsResult(res.data);
            }
            else {
                setClusterHitsError((_a = res.message) !== null && _a !== void 0 ? _a : 'Cluster hits failed');
            }
        }
        catch (e) {
            setClusterHitsError(e instanceof Error ? e.message : 'Cluster hits failed');
        }
        finally {
            setIsClusteringHits(false);
        }
    }, [apiService]);
    const handleDeploy = (0, react_1.useCallback)(async ({ schedule, enabled }) => {
        var _a;
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
            }
            else {
                setDeployError((_a = res.message) !== null && _a !== void 0 ? _a : 'Deploy failed');
            }
        }
        catch (e) {
            setDeployError(e instanceof Error ? e.message : 'Deploy failed');
        }
        finally {
            setIsDeploying(false);
        }
    }, [apiService, yaml, conversionFormat, conversionPipeline, addToast]);
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiProvider, { children: [(0, jsx_runtime_1.jsx)(TopNav_1.TopNav, { onNewRule: () => { setView('editor'); setYaml(DEFAULT_RULE); }, onSelectRule: () => { setView('editor'); setShowRuleSelector(true); }, onSyncRules: handleSyncRules, onOpenSettings: () => setShowSettings(true), onOpenCoverage: () => setView(v => v === 'coverage' ? 'editor' : 'coverage'), isSyncing: isSyncing, coverageActive: view === 'coverage' }), view === 'coverage' && ((0, jsx_runtime_1.jsx)(PosturePage_1.PosturePage, { apiService: apiService })), view === 'editor' && ((0, jsx_runtime_1.jsx)(MainLayout_1.MainLayout, { sigmaYaml: yaml, parsedRule: rule, parseError: parseError, onYamlChange: setYaml, onRuleChange: updateRule, isLoading: false, conversionFormat: conversionFormat, onConversionFormatChange: setConversionFormat, conversionResult: conversionResult, conversionError: conversionError, isConverting: isConverting, conversionPipeline: conversionPipeline, onTestRun: handleTestRun, testRunResult: testRunResult, testRunError: testRunError, isTestRunning: isTestRunning, onDeploy: handleDeploy, deployResult: deployResult, deployError: deployError, isDeploying: isDeploying, clusterHitsResult: clusterHitsResult, clusterHitsError: clusterHitsError, isClusteringHits: isClusteringHits, onClusterHits: handleClusterHits, apiService: apiService })), showRuleSelector && ((0, jsx_runtime_1.jsx)(RuleSelector_1.RuleSelector, { onClose: () => setShowRuleSelector(false), onSelect: setYaml, apiService: apiService })), showSettings && ((0, jsx_runtime_1.jsx)(SettingsModal_1.SettingsModal, { onClose: () => setShowSettings(false), apiService: apiService })), (0, jsx_runtime_1.jsx)(eui_1.EuiGlobalToastList, { toasts: toasts, dismissToast: removeToast, toastLifeTimeMs: 5000 })] }));
};
exports.App = App;
//# sourceMappingURL=App.js.map