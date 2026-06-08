"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const eui_1 = require("@elastic/eui");
const STATUS_OPTIONS = [
    { value: '', text: '— select —' },
    { value: 'stable', text: 'stable' },
    { value: 'test', text: 'test' },
    { value: 'experimental', text: 'experimental' },
    { value: 'deprecated', text: 'deprecated' },
];
const LEVEL_OPTIONS = [
    { value: '', text: '— select —' },
    { value: 'critical', text: 'critical' },
    { value: 'high', text: 'high' },
    { value: 'medium', text: 'medium' },
    { value: 'low', text: 'low' },
    { value: 'informational', text: 'informational' },
];
const IR_PHASE_OPTIONS = [
    { value: '', text: '— none —' },
    { value: 'preparation', text: 'Preparation' },
    { value: 'detection', text: 'Detection' },
    { value: 'containment', text: 'Containment' },
    { value: 'eradication', text: 'Eradication' },
    { value: 'recovery', text: 'Recovery' },
    { value: 'post-incident', text: 'Post-Incident' },
];
const VisualEditor = ({ rule, onChange }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!rule) {
        return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, hasShadow: false, paddingSize: "s", style: { height: '100%' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h3", { children: "Visual Editor" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { color: "subdued", size: "s", children: (0, jsx_runtime_1.jsx)("p", { children: "Fix YAML errors to enable visual editing." }) })] }));
    }
    const logsource = (_a = rule.logsource) !== null && _a !== void 0 ? _a : {};
    const tags = Array.isArray(rule.tags) ? rule.tags : [];
    const patchLogsource = (field, value) => onChange({ logsource: { ...logsource, [field]: value } });
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, hasShadow: false, paddingSize: "s", style: { height: '100%', overflowY: 'auto' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h3", { children: "Visual Editor" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiForm, { component: "div", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Title", fullWidth: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { fullWidth: true, value: (_b = rule.title) !== null && _b !== void 0 ? _b : '', onChange: e => onChange({ title: e.target.value }) }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Status", fullWidth: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { fullWidth: true, options: STATUS_OPTIONS, value: (_c = rule.status) !== null && _c !== void 0 ? _c : '', onChange: e => onChange({ status: e.target.value }) }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Level", fullWidth: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { fullWidth: true, options: LEVEL_OPTIONS, value: (_d = rule.level) !== null && _d !== void 0 ? _d : '', onChange: e => onChange({ level: e.target.value }) }) }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Description", fullWidth: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiTextArea, { fullWidth: true, rows: 3, resize: "vertical", value: (_e = rule.description) !== null && _e !== void 0 ? _e : '', onChange: e => onChange({ description: e.target.value }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xxs", children: (0, jsx_runtime_1.jsx)("h4", { style: { color: 'var(--euiColorMediumShade, #69707d)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }, children: "Log Source" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "xs" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Category", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { value: (_f = logsource.category) !== null && _f !== void 0 ? _f : '', onChange: e => patchLogsource('category', e.target.value) }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Product", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { value: (_g = logsource.product) !== null && _g !== void 0 ? _g : '', onChange: e => patchLogsource('product', e.target.value) }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Service", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldText, { value: (_h = logsource.service) !== null && _h !== void 0 ? _h : '', onChange: e => patchLogsource('service', e.target.value) }) }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "s" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "Tags", fullWidth: true, helpText: "Press Enter to add a tag", children: (0, jsx_runtime_1.jsx)(eui_1.EuiComboBox, { fullWidth: true, noSuggestions: true, selectedOptions: tags.map(t => ({ label: t })), onChange: opts => onChange({ tags: opts.map(o => o.label) }), onCreateOption: tag => onChange({ tags: [...tags, tag] }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFormRow, { label: "IR Phase", fullWidth: true, helpText: "NIST IR lifecycle phase this rule supports", children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { fullWidth: true, options: IR_PHASE_OPTIONS, value: (_j = rule['x-ir-phase']) !== null && _j !== void 0 ? _j : '', onChange: e => onChange({ 'x-ir-phase': e.target.value || undefined }) }) })] })] }));
};
exports.VisualEditor = VisualEditor;
//# sourceMappingURL=VisualEditor.js.map