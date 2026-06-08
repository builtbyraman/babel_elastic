"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosturePage = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const CoverageHeatmap_1 = require("./CoverageHeatmap");
const IrReadinessPanel_1 = require("./IrReadinessPanel");
const DataSourcePanel_1 = require("./DataSourcePanel");
const PosturePage = ({ apiService }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('heatmap');
    return ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 48, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { borderBottom: '1px solid #D3DAE6', paddingLeft: 16, paddingTop: 8, flexShrink: 0 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiTabs, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTab, { isSelected: activeTab === 'heatmap', onClick: () => setActiveTab('heatmap'), children: "ATT&CK Heatmap" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTab, { isSelected: activeTab === 'ir_readiness', onClick: () => setActiveTab('ir_readiness'), children: "IR Readiness" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTab, { isSelected: activeTab === 'data_sources', onClick: () => setActiveTab('data_sources'), children: "Data Sources" })] }) }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto' }, children: [activeTab === 'heatmap' && (0, jsx_runtime_1.jsx)(CoverageHeatmap_1.CoverageHeatmap, { apiService: apiService, embedded: true }), activeTab === 'ir_readiness' && (0, jsx_runtime_1.jsx)(IrReadinessPanel_1.IrReadinessPanel, { apiService: apiService }), activeTab === 'data_sources' && (0, jsx_runtime_1.jsx)(DataSourcePanel_1.DataSourcePanel, { apiService: apiService })] })] }));
};
exports.PosturePage = PosturePage;
//# sourceMappingURL=PosturePage.js.map