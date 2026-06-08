"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainLayout = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const eui_1 = require("@elastic/eui");
const YamlEditor_1 = require("./YamlEditor");
const VisualEditor_1 = require("./VisualEditor");
const ConversionPanel_1 = require("./ConversionPanel");
const MainLayout = ({ sigmaYaml, parsedRule, parseError, onYamlChange, onRuleChange, isLoading, conversionFormat, onConversionFormatChange, conversionResult, conversionError, isConverting, conversionPipeline, onTestRun, testRunResult, testRunError, isTestRunning, onDeploy, deployResult, deployError, isDeploying, clusterHitsResult, clusterHitsError, isClusteringHits, onClusterHits, apiService, }) => {
    if (isLoading) {
        return ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", alignItems: "center", style: { height: '80vh' }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "xl" }) }) }));
    }
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "m", style: { height: 'calc(100vh - 96px)', padding: '12px', marginTop: '48px' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: 4, children: (0, jsx_runtime_1.jsx)(YamlEditor_1.YamlEditor, { value: sigmaYaml, onChange: onYamlChange, parseError: parseError, apiService: apiService }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: 3, children: (0, jsx_runtime_1.jsx)(VisualEditor_1.VisualEditor, { rule: parsedRule, onChange: onRuleChange }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: 3, children: (0, jsx_runtime_1.jsx)(ConversionPanel_1.ConversionPanel, { format: conversionFormat, onFormatChange: onConversionFormatChange, result: conversionResult, error: conversionError, isConverting: isConverting, pipeline: conversionPipeline, hasRule: parsedRule !== null, onTestRun: onTestRun, testRunResult: testRunResult, testRunError: testRunError, isTestRunning: isTestRunning, onDeploy: onDeploy, deployResult: deployResult, deployError: deployError, isDeploying: isDeploying, clusterHitsResult: clusterHitsResult, clusterHitsError: clusterHitsError, isClusteringHits: isClusteringHits, onClusterHits: onClusterHits }) })] }));
};
exports.MainLayout = MainLayout;
//# sourceMappingURL=MainLayout.js.map