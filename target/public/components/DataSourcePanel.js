"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourcePanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const PRODUCT_ICONS = {
    windows: '🪟',
    linux: '🐧',
    endpoint: '🛡',
    network: '🌐',
    aws: '☁️',
    gcp: '☁️',
    azure: '☁️',
    office365: '📧',
    okta: '🔐',
    google_workspace: '📁',
    github: '🐙',
};
const SIGMA_CATEGORIES = {
    windows: ['process_creation', 'network_connection', 'dns_query', 'file_event', 'registry_add', 'registry_set', 'image_load'],
    linux: ['process_creation', 'network_connection', 'file_event', 'user_change'],
    endpoint: ['process_creation', 'network_connection', 'file_event', 'registry_add'],
    network: ['network_connection', 'dns_query', 'proxy', 'firewall'],
    aws: ['cloud_trail', 'aws_cloudtrail'],
    gcp: ['gcp_audit'],
    azure: ['azure_activity'],
    office365: ['office365_exchange', 'office365_sharepoint'],
    okta: ['okta'],
    google_workspace: ['google_workspace'],
    github: ['github'],
};
const DataSourcePanel = ({ apiService }) => {
    const [sources, setSources] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const load = (0, react_1.useCallback)(async () => {
        var _a;
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiService.getDataSources();
            setSources((_a = res === null || res === void 0 ? void 0 : res.sources) !== null && _a !== void 0 ? _a : []);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load data sources');
        }
        finally {
            setIsLoading(false);
        }
    }, [apiService]);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    const available = sources.filter(s => s.available);
    const missing = sources.filter(s => !s.available);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 16 }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { alignItems: "flexStart", justifyContent: "spaceBetween", gutterSize: "m", children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { grow: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "m", children: (0, jsx_runtime_1.jsx)("h2", { children: "Data Source Awareness" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", children: (0, jsx_runtime_1.jsx)("p", { children: "Elasticsearch indices mapped to SIGMA logsource categories. Rules for uncovered sources won't produce alerts." }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { iconType: "refresh", onClick: load, isLoading: isLoading, size: "s", children: "Refresh" }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), isLoading && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", style: { paddingTop: 60 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { grow: false, style: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "xl" }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", children: "Introspecting Elasticsearch indices\u2026" })] }) })), error && !isLoading && ((0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: error, color: "warning", iconType: "warning" })), !isLoading && sources.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "m", wrap: true, responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 130, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: available.length }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Sources with data" })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 130, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: missing.length }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "No coverage" })] }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "l" }), missing.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiCallOut, { title: `${missing.length} logsource product${missing.length > 1 ? 's' : ''} have no data in this cluster`, color: "warning", iconType: "alert", size: "s", children: [(0, jsx_runtime_1.jsx)("p", { children: "SIGMA rules targeting these products will not produce alerts without ingesting the relevant log data." }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "xs", wrap: true, style: { marginTop: 8 }, children: missing.map(s => {
                                            var _a;
                                            return ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "hollow", children: [(_a = PRODUCT_ICONS[s.product]) !== null && _a !== void 0 ? _a : '•', " ", s.label] }) }, s.product));
                                        }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" })] })), (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h3", { children: "Logsource Products" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 12 }, children: sources.map(source => {
                            var _a, _b;
                            const categories = (_a = SIGMA_CATEGORIES[source.product]) !== null && _a !== void 0 ? _a : [];
                            const borderColor = source.available ? '#017D73' : '#D3DAE6';
                            const headerBg = source.available ? '#017D73' : '#6a717d';
                            return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "none", style: { width: 210, borderTop: `3px solid ${borderColor}`, overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { background: headerBg, padding: '8px 12px', color: '#fff' }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { alignItems: "center", gutterSize: "s", responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 18 }, children: (_b = PRODUCT_ICONS[source.product]) !== null && _b !== void 0 ? _b : '•' }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, color: '#fff', fontSize: 13 }, children: source.label }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: source.available ? 'success' : 'default', style: { fontSize: 10 }, children: source.available ? 'Active' : 'No data' }) })] }) }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '10px 12px' }, children: [source.available ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: [source.index_count, " index", source.index_count !== 1 ? 'es' : '', " \u00B7 ", source.doc_count.toLocaleString(), " docs"] }), source.indices.slice(0, 3).map(idx => ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", style: { marginTop: 2, fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }, children: idx }, idx))), source.index_count > 3 && ((0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: ["+", source.index_count - 3, " more"] })), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "xs" })] })) : ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 6 }, children: "No matching indices found" })), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 4, fontWeight: 600 }, children: "SIGMA categories" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "xs", wrap: true, children: categories.map(cat => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiToolTip, { content: source.available ? 'Category available' : 'No data source for this category', children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: source.available ? 'hollow' : 'default', style: { fontSize: 9 }, children: cat }) }) }, cat))) })] })] }, source.product));
                        }) })] }))] }));
};
exports.DataSourcePanel = DataSourcePanel;
//# sourceMappingURL=DataSourcePanel.js.map