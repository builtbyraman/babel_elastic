"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleSelector = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const js_yaml_1 = __importDefault(require("js-yaml"));
const PAGE_SIZE = 20;
const STRIP_FIELDS = new Set(['_path', '_synced_at', '_source_repo', '_repo_slug', '_repo_name']);
const TACTIC_LABELS = {
    'reconnaissance': 'Reconnaissance',
    'resource-development': 'Resource Development',
    'initial-access': 'Initial Access',
    'execution': 'Execution',
    'persistence': 'Persistence',
    'privilege-escalation': 'Privilege Escalation',
    'defense-evasion': 'Defense Evasion',
    'credential-access': 'Credential Access',
    'discovery': 'Discovery',
    'lateral-movement': 'Lateral Movement',
    'collection': 'Collection',
    'command-and-control': 'Command and Control',
    'exfiltration': 'Exfiltration',
    'impact': 'Impact',
};
const TACTIC_COLORS = {
    'reconnaissance': '#74b9ff',
    'resource-development': '#a29bfe',
    'initial-access': '#fd79a8',
    'execution': '#e17055',
    'persistence': '#fdcb6e',
    'privilege-escalation': '#e84393',
    'defense-evasion': '#6c5ce7',
    'credential-access': '#d63031',
    'discovery': '#00b894',
    'lateral-movement': '#0984e3',
    'collection': '#00cec9',
    'command-and-control': '#b2bec3',
    'exfiltration': '#fab1a0',
    'impact': '#ff7675',
};
const MITRE_TACTIC_OPTIONS = [
    { value: '', text: 'All tactics' },
    ...Object.entries(TACTIC_LABELS).map(([value, text]) => ({ value, text })),
];
const IR_PHASE_OPTIONS = [
    { value: '', text: 'All IR phases' },
    { value: 'preparation', text: 'Preparation' },
    { value: 'detection', text: 'Detection' },
    { value: 'containment', text: 'Containment' },
    { value: 'eradication', text: 'Eradication' },
    { value: 'recovery', text: 'Recovery' },
    { value: 'post-incident', text: 'Post-Incident' },
];
const IR_PHASE_COLORS = {
    preparation: '#006BB4',
    detection: '#6c5ce7',
    containment: '#e17055',
    eradication: '#d63031',
    recovery: '#00b894',
    'post-incident': '#636e72',
};
function parseMitre(tags) {
    const result = { tactics: [], techniques: [] };
    if (!Array.isArray(tags))
        return result;
    for (const tag of tags) {
        if (typeof tag !== 'string' || !tag.startsWith('attack.'))
            continue;
        const val = tag.slice('attack.'.length);
        if (/^t\d{4}(\.\d+)?$/i.test(val)) {
            result.techniques.push(val.toUpperCase());
        }
        else if (TACTIC_LABELS[val]) {
            result.tactics.push(val);
        }
    }
    return result;
}
function fixDates(val) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))
        return val.split('T')[0];
    if (Array.isArray(val))
        return val.map(fixDates);
    if (val !== null && typeof val === 'object') {
        return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, fixDates(v)]));
    }
    return val;
}
function docToYaml(doc) {
    const stripped = Object.fromEntries(Object.entries(doc).filter(([k]) => !STRIP_FIELDS.has(k)));
    const clean = fixDates(stripped);
    return js_yaml_1.default.dump(clean, { indent: 4, lineWidth: -1, noRefs: true });
}
const LEVEL_COLORS = {
    critical: 'danger', high: 'warning', medium: 'primary',
    low: 'default', informational: 'subdued',
};
const RuleSelector = ({ onClose, onSelect, apiService }) => {
    const [search, setSearch] = (0, react_1.useState)('');
    const [mitreFilter, setMitreFilter] = (0, react_1.useState)('');
    const [irPhaseFilter, setIrPhaseFilter] = (0, react_1.useState)('');
    const [pageIndex, setPageIndex] = (0, react_1.useState)(0);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [docs, setDocs] = (0, react_1.useState)([]);
    const [total, setTotal] = (0, react_1.useState)(0);
    const fetchRules = (0, react_1.useCallback)(async (q, mitre, irPhase, page) => {
        setIsLoading(true);
        try {
            const res = await apiService.searchRules({
                search: q || undefined,
                mitre: mitre || undefined,
                irPhase: irPhase || undefined,
                from: page * PAGE_SIZE,
                size: PAGE_SIZE,
            });
            if (res.success && res.data) {
                setDocs(res.data.docs);
                setTotal(res.data.total);
            }
        }
        catch { /* ignore */ }
        finally {
            setIsLoading(false);
        }
    }, [apiService]);
    (0, react_1.useEffect)(() => {
        fetchRules(search, mitreFilter, irPhaseFilter, pageIndex);
    }, [fetchRules, search, mitreFilter, irPhaseFilter, pageIndex]);
    const handleSearchChange = (0, react_1.useCallback)((e) => {
        setSearch(e.target.value);
        setPageIndex(0);
    }, []);
    const handleMitreChange = (0, react_1.useCallback)((e) => {
        setMitreFilter(e.target.value);
        setPageIndex(0);
    }, []);
    const handleIrPhaseChange = (0, react_1.useCallback)((e) => {
        setIrPhaseFilter(e.target.value);
        setPageIndex(0);
    }, []);
    const handleSelect = (0, react_1.useCallback)((doc) => {
        onSelect(docToYaml(doc));
        onClose();
    }, [onSelect, onClose]);
    const columns = [
        {
            field: 'title',
            name: 'Title',
            render: (title, doc) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiButtonEmpty, { size: "xs", flush: "left", onClick: () => handleSelect(doc), children: String(title !== null && title !== void 0 ? title : '(untitled)') }), (() => {
                        var _a;
                        const { techniques } = parseMitre(doc.tags);
                        const irPhase = doc['x-ir-phase'];
                        if (techniques.length === 0 && !irPhase)
                            return null;
                        const shown = techniques.slice(0, 3);
                        const extra = techniques.length - shown.length;
                        return ((0, jsx_runtime_1.jsxs)("div", { style: { paddingLeft: 8, paddingBottom: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }, children: [shown.map(t => ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "hollow", style: { marginRight: 2, fontSize: '0.65rem' }, children: t }, t))), extra > 0 && (0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "hollow", style: { fontSize: '0.65rem' }, children: ["+", extra] }), irPhase && ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { style: { backgroundColor: (_a = IR_PHASE_COLORS[irPhase]) !== null && _a !== void 0 ? _a : '#636e72', color: '#fff', fontSize: '0.62rem' }, children: irPhase }))] }));
                    })()] })),
        },
        {
            field: 'tags',
            name: 'Tactic',
            width: '160px',
            render: (tags) => {
                const { tactics } = parseMitre(tags);
                if (tactics.length === 0)
                    return (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "\u2014" });
                return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 2 }, children: [tactics.slice(0, 2).map(t => {
                            var _a;
                            return ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { style: {
                                    backgroundColor: (_a = TACTIC_COLORS[t]) !== null && _a !== void 0 ? _a : '#b2bec3',
                                    color: '#fff',
                                    fontSize: '0.62rem',
                                }, children: TACTIC_LABELS[t] }, t));
                        }), tactics.length > 2 && ((0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "hollow", style: { fontSize: '0.62rem' }, children: ["+", tactics.length - 2] }))] }));
            },
        },
        {
            field: 'level',
            name: 'Severity',
            width: '80px',
            render: (level) => {
                var _a;
                return level ? ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: ((_a = LEVEL_COLORS[String(level)]) !== null && _a !== void 0 ? _a : 'default'), children: String(level) })) : null;
            },
        },
    ];
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiFlyout, { onClose: onClose, size: "l", "aria-labelledby": "ruleSelectorTitle", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlyoutHeader, { hasBorder: true, children: (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "m", children: (0, jsx_runtime_1.jsx)("h2", { id: "ruleSelectorTitle", children: "Select Rule" }) }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlyoutBody, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)(eui_1.EuiFieldSearch, { fullWidth: true, placeholder: "Search title, description, technique ID\u2026", value: search, onChange: handleSearchChange, isClearable: true, isLoading: isLoading }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 180 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { options: MITRE_TACTIC_OPTIONS, value: mitreFilter, onChange: handleMitreChange, "aria-label": "Filter by MITRE tactic" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 160 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { options: IR_PHASE_OPTIONS, value: irPhaseFilter, onChange: handleIrPhaseChange, "aria-label": "Filter by IR phase" }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), isLoading && docs.length === 0 ? ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", children: (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "xl" }) }) })) : docs.length === 0 ? ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { color: "subdued", textAlign: "center", children: (0, jsx_runtime_1.jsxs)("p", { children: ["No rules found. ", !search && !mitreFilter ? 'Use "Sync Rules" to import from GitHub.' : 'Try a different search or filter.'] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 8 }, children: [total.toLocaleString(), " rule", total !== 1 ? 's' : '', mitreFilter ? ` · ${TACTIC_LABELS[mitreFilter]}` : '', irPhaseFilter ? ` · IR: ${irPhaseFilter}` : ''] }), (0, jsx_runtime_1.jsx)(eui_1.EuiBasicTable, { items: docs, columns: columns, pagination: {
                                    pageIndex,
                                    pageSize: PAGE_SIZE,
                                    totalItemCount: total,
                                    showPerPageOptions: false,
                                }, onChange: ({ page }) => { var _a; return setPageIndex((_a = page === null || page === void 0 ? void 0 : page.index) !== null && _a !== void 0 ? _a : 0); } })] }))] })] }));
};
exports.RuleSelector = RuleSelector;
//# sourceMappingURL=RuleSelector.js.map