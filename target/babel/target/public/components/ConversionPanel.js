"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const FORMAT_OPTIONS = [
    { value: 'es-qs', text: 'Lucene query string' },
    { value: 'dsl_lucene', text: 'Query DSL' },
    { value: 'kibana_ndjson', text: 'Kibana NDJSON' },
    { value: 'siem_rule', text: 'SIEM Rule (JSON)' },
    { value: 'siem_rule_ndjson', text: 'SIEM Rule (NDJSON)' },
    { value: 'eql', text: 'EQL' },
    { value: 'esql', text: 'ES|QL' },
    { value: 'elastalert', text: 'ElastAlert' },
];
const PIPELINE_LABELS = {
    ecs_windows: 'ECS Windows',
    ecs_windows_old: 'ECS Windows (old)',
    ecs_linux: 'ECS Linux',
    ecs_zeek_beats: 'ECS Zeek',
    ecs_zeek_corelight: 'ECS Zeek (Corelight)',
    zeek_raw: 'Zeek raw',
    ecs_kubernetes: 'ECS Kubernetes',
    ecs_macos_esf: 'ECS macOS',
};
const DISCOVER_FORMATS = new Set(['es-qs', 'eql', 'esql']);
const DISCOVER_LANGUAGE = {
    'es-qs': 'lucene',
    'eql': 'eql',
    'esql': 'esql',
};
const TESTABLE_FORMATS = new Set(['eql', 'esql', 'es-qs', 'dsl_lucene']);
const DEPLOYABLE_FORMATS = new Set(['eql', 'esql', 'es-qs']);
function risonStr(s) {
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
function buildDiscoverUrl(format, query) {
    const language = DISCOVER_LANGUAGE[format];
    return `/app/discover#/?_a=(query:(language:${language},query:${risonStr(query)}))`;
}
function openInDiscover(format, query) {
    const target = window !== window.parent ? window.parent : window;
    target.location.href = buildDiscoverUrl(format, query);
}
const ConversionPanel = ({ format, onFormatChange, result, error, isConverting, pipeline, hasRule, onTestRun, testRunResult, testRunError, isTestRunning, onDeploy, deployResult, deployError, isDeploying, clusterHitsResult, clusterHitsError, isClusteringHits, onClusterHits, }) => {
    var _a;
    const [indexPattern, setIndexPattern] = (0, react_1.useState)('*');
    const [timeframeHours, setTimeframeHours] = (0, react_1.useState)(24);
    const [showBacktest, setShowBacktest] = (0, react_1.useState)(false);
    const [showDeploy, setShowDeploy] = (0, react_1.useState)(false);
    const [deployEnabled] = (0, react_1.useState)(false);
    const canOpenInDiscover = !!result && DISCOVER_FORMATS.has(format);
    const canRunBacktest = !!result && TESTABLE_FORMATS.has(format);
    const canDeploy = !!result && DEPLOYABLE_FORMATS.has(format);
    const handleCopy = (0, react_1.useCallback)(() => {
        if (result)
            navigator.clipboard.writeText(result).catch(() => { });
    }, [result]);
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, hasShadow: false, paddingSize: "s", style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flex: 1 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h3", { children: "Elasticsearch Output" }) }) }), hasRule && ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "hollow", children: (_a = PIPELINE_LABELS[pipeline]) !== null && _a !== void 0 ? _a : pipeline }))] }), (0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { fullWidth: true, compressed: true, options: FORMAT_OPTIONS, value: format, onChange: e => onFormatChange(e.target.value), "aria-label": "Output format" }) }), hasRule && result && ((0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, marginTop: 8 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", responsive: false, children: [canOpenInDiscover && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { fullWidth: true, size: "s", iconType: "discoverApp", onClick: () => openInDiscover(format, result), children: "Open in Discover" }) })), canRunBacktest && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { fullWidth: true, size: "s", iconType: "play", color: "success", onClick: () => { setShowBacktest(v => !v); setShowDeploy(false); }, children: "Backtest" }) })), canDeploy && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { fullWidth: true, size: "s", iconType: "exportAction", color: "primary", onClick: () => { setShowDeploy(v => !v); setShowBacktest(false); }, children: "Deploy" }) }))] }) })), showBacktest && canRunBacktest && ((0, jsx_runtime_1.jsxs)("div", { style: { flexShrink: 0, marginTop: 8, padding: '8px', backgroundColor: 'rgba(0,0,0,0.025)', borderRadius: 4 }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "flexEnd", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: 3, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { compressed: true, placeholder: "Index pattern (e.g. winlogbeat-*)", value: indexPattern, onChange: e => setIndexPattern(e.target.value), prepend: "Index" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: 1, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldNumber, { compressed: true, placeholder: "24", value: timeframeHours, onChange: e => setTimeframeHours(Number(e.target.value)), min: 1, max: 2160, append: "h" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { size: "s", fill: true, isLoading: isTestRunning, onClick: () => onTestRun({ indexPattern, timeframeHours }), children: "Run" }) })] }), testRunError && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: "Backtest failed", color: "danger", iconType: "error", size: "s", children: (0, jsx_runtime_1.jsx)("p", { style: { fontSize: '0.8em' }, children: testRunError }) }) })), testRunResult && !testRunError && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 6 }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "center", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: testRunResult.hit_count === 0 ? 'success' : testRunResult.hit_count > 1000 ? 'danger' : 'warning', children: [testRunResult.hit_count.toLocaleString(), " hits"] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "hollow", children: [testRunResult.timing_ms, "ms"] }) }), testRunResult.hit_count > 0 && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiButtonEmpty, { size: "xs", iconType: "aggregate", isLoading: isClusteringHits, onClick: () => onClusterHits(testRunResult.test_run_id), children: "Cluster hits" }) }))] }), testRunResult.sample_events.length > 0 && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiAccordion, { id: "sample-events", buttonContent: (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: (0, jsx_runtime_1.jsxs)("span", { children: ["Sample events (", testRunResult.sample_events.length, ")"] }) }), children: (0, jsx_runtime_1.jsx)("div", { style: { maxHeight: 160, overflowY: 'auto', marginTop: 4 }, children: testRunResult.sample_events.slice(0, 5).map((evt, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 4 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: (0, jsx_runtime_1.jsx)("span", { children: evt.timestamp }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiCode, { language: "json", transparentBackground: true, children: JSON.stringify(evt.source, null, 2).slice(0, 300) })] }, i))) }) }) })), clusterHitsError && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: "Cluster failed", color: "danger", iconType: "error", size: "s", children: (0, jsx_runtime_1.jsx)("p", { style: { fontSize: '0.8em' }, children: clusterHitsError }) }) })), clusterHitsResult && !clusterHitsError && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiAccordion, { id: "cluster-hits", initialIsOpen: true, buttonContent: (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", children: (0, jsx_runtime_1.jsx)("strong", { children: "Top contributing field values" }) }), children: (0, jsx_runtime_1.jsx)("div", { style: { maxHeight: 200, overflowY: 'auto', marginTop: 4 }, children: clusterHitsResult.clusters.map((cf, ci) => ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: (0, jsx_runtime_1.jsx)("code", { children: cf.field }) }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }, children: cf.buckets.map((b, bi) => ((0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "hollow", children: [b.value, " (", b.count, ")"] }, bi))) })] }, ci))) }) }) }))] }))] })), showDeploy && canDeploy && ((0, jsx_runtime_1.jsxs)("div", { style: { flexShrink: 0, marginTop: 8, padding: '8px', backgroundColor: 'rgba(0,0,0,0.025)', borderRadius: 4 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: (0, jsx_runtime_1.jsx)("p", { children: "Creates a disabled detection rule in Elastic Security. Review and enable it there." }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { size: "s", fill: true, isLoading: isDeploying, onClick: () => onDeploy({ enabled: deployEnabled }), iconType: "exportAction", children: "Create Detection Rule" }), deployError && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: "Deploy failed", color: "danger", iconType: "error", size: "s", children: (0, jsx_runtime_1.jsx)("p", { style: { fontSize: '0.8em' }, children: deployError }) }) })), deployResult && !deployError && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: "Rule created", color: "success", iconType: "check", size: "s", children: (0, jsx_runtime_1.jsxs)("p", { style: { fontSize: '0.8em' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: deployResult.name }), " \u2014 ID: ", (0, jsx_runtime_1.jsx)("code", { children: deployResult.rule_id })] }) }) }))] })), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, minHeight: 0, marginTop: 8, display: 'flex', flexDirection: 'column' }, children: [!hasRule && ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { color: "subdued", size: "s", children: (0, jsx_runtime_1.jsx)("p", { children: "Fix YAML errors to enable conversion." }) })), hasRule && isConverting && ((0, jsx_runtime_1.jsx)("div", { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "l" }) })), hasRule && !isConverting && error && ((0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: "Conversion failed", color: "danger", iconType: "error", size: "s", children: (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: 'monospace', fontSize: '0.8em', whiteSpace: 'pre-wrap' }, children: error }) })), hasRule && !isConverting && result && ((0, jsx_runtime_1.jsxs)("div", { style: {
                            flex: 1,
                            minHeight: 0,
                            position: 'relative',
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.025)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                        }, children: [(0, jsx_runtime_1.jsx)("pre", { style: {
                                    margin: 0,
                                    padding: '10px 12px',
                                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                                    fontSize: '12.5px',
                                    lineHeight: '1.6',
                                    color: 'inherit',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    height: '100%',
                                    overflowY: 'auto',
                                    boxSizing: 'border-box',
                                }, children: result }), (0, jsx_runtime_1.jsx)(eui_1.EuiButtonIcon, { "aria-label": "Copy output", iconType: "copyClipboard", size: "s", onClick: handleCopy, style: {
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    borderRadius: 4,
                                } })] }))] })] }));
};
exports.ConversionPanel = ConversionPanel;
//# sourceMappingURL=ConversionPanel.js.map