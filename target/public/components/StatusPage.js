"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
function StatusBadge({ status }) {
    const color = status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : 'danger';
    return (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: color, children: status });
}
function ServiceCard({ name, status, latency, info }) {
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 220 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", style: { fontWeight: 700, marginBottom: 6 }, children: name }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "center", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(StatusBadge, { status: status }) }), latency != null && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: [latency, "ms"] }) }))] }), info?.version && ((0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginTop: 4 }, children: ["v", info.version.number ?? info.version] }))] }));
}
const StatusPage = ({ apiService }) => {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [status, setStatus] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [dataSources, setDataSources] = (0, react_1.useState)(null);
    const [repos, setRepos] = (0, react_1.useState)(null);
    const fetchStatus = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statusRes, dsRes, reposRes] = await Promise.allSettled([
                apiService.getStatus(),
                apiService.getDataSources(),
                apiService.getRepos(),
            ]);
            if (statusRes.status === 'fulfilled')
                setStatus(statusRes.value);
            else
                setError(statusRes.reason?.message || 'Failed to load status');
            if (dsRes.status === 'fulfilled')
                setDataSources(dsRes.value?.sources ?? null);
            if (reposRes.status === 'fulfilled')
                setRepos(reposRes.value?.data?.repos ?? []);
        }
        finally {
            setLoading(false);
        }
    }, [apiService]);
    (0, react_1.useEffect)(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, 30000);
        return () => clearInterval(id);
    }, [fetchStatus]);
    if (loading)
        return ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, {}) }) }));
    const services = status?.services ?? [];
    const availableSources = (dataSources ?? []).filter((s) => s.available);
    const missingSources = (dataSources ?? []).filter((s) => !s.available);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "s", children: (0, jsx_runtime_1.jsx)("h4", { children: "Integration & Status" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), services.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xxs", children: (0, jsx_runtime_1.jsx)("h5", { children: "Services" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "s", wrap: true, children: services.map((s) => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(ServiceCard, { name: s.name, status: s.status, latency: s.latency_ms, info: s.info }) }, s.name))) }), (0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "m" })] })), error && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: error, color: "warning", iconType: "warning", size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" })] })), dataSources !== null && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xxs", children: (0, jsx_runtime_1.jsx)("h5", { children: "Data Sources" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "m", responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "s", style: { minWidth: 110, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 20 }, children: availableSources.length }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Active" })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "s", style: { minWidth: 110, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 20 }, children: missingSources.length }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "No data" })] }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "xs", wrap: true, children: dataSources.map((s) => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: s.available ? 'success' : 'default', children: s.label }) }, s.product))) })] })), repos !== null && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "m" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xxs", children: (0, jsx_runtime_1.jsx)("h5", { children: "Configured Repositories" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), repos.length === 0 ? ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", children: "No repositories configured. Add one in Settings." })) : ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "s", wrap: true, children: repos.map((repo) => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "s", style: { minWidth: 220 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "center", children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", style: { fontWeight: 700 }, children: repo.name }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: repo.url })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: repo.enabled ? 'success' : 'default', children: repo.enabled ? 'enabled' : 'disabled' }) })] }) }) }, repo.id))) }))] })), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { onClick: fetchStatus, iconType: "refresh", size: "s", children: "Refresh Status" })] }));
};
exports.StatusPage = StatusPage;
//# sourceMappingURL=StatusPage.js.map