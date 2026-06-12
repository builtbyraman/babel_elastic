"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrReadinessPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const SCENARIOS = [
    { value: 'ransomware', label: 'Ransomware', description: 'File-encrypting ransomware (LockBit, BlackCat, ALPHV)' },
    { value: 'credential_theft', label: 'Credential Theft', description: 'LSASS dumping, Kerberoasting, Pass-the-Hash' },
    { value: 'lateral_movement', label: 'Lateral Movement', description: 'Internal pivoting via RDP, SMB, WMI' },
    { value: 'insider_threat', label: 'Insider Threat', description: 'Data collection and exfiltration by malicious insider' },
];
const SCENARIO_OPTIONS = [
    { value: '', text: '— select a scenario —' },
    ...SCENARIOS.map(s => ({ value: s.value, text: s.label })),
];
const PHASE_ICONS = {
    preparation: '🛡',
    detection: '🔍',
    containment: '🚧',
    eradication: '🧹',
    recovery: '♻',
    'post-incident': '📋',
};
const PHASE_COLORS = {
    preparation: '#006BB4',
    detection: '#6c5ce7',
    containment: '#e17055',
    eradication: '#d63031',
    recovery: '#00b894',
    'post-incident': '#636e72',
};
function buildRuleYamls(docs) {
    return docs.map((doc) => {
        const tags = Array.isArray(doc.tags) ? doc.tags : [];
        const title = String(doc.title ?? 'Unknown').replace(/"/g, '\\"');
        const irPhase = doc['x-ir-phase'] ? `x-ir-phase: ${doc['x-ir-phase']}\n` : '';
        const tagsSection = tags.length > 0
            ? `tags:\n${tags.map((t) => `  - ${String(t)}`).join('\n')}\n`
            : '';
        return `title: "${title}"\nstatus: test\n${tagsSection}${irPhase}`;
    });
}
const IrReadinessPanel = ({ apiService }) => {
    const [scenario, setScenario] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [ruleCount, setRuleCount] = (0, react_1.useState)(0);
    const handleAnalyze = (0, react_1.useCallback)(async () => {
        if (!scenario)
            return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const countRes = await apiService.searchRules({ size: 1 });
            const total = countRes?.data?.total ?? 0;
            if (total === 0) {
                setError('No rules in library. Use Sync Rules to import rules first.');
                return;
            }
            const res = await apiService.searchRules({ size: total });
            const docs = res?.data?.docs ?? [];
            setRuleCount(total);
            const ruleYamls = buildRuleYamls(docs);
            const data = await apiService.irReadiness(scenario, ruleYamls);
            setResult(data);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'IR readiness analysis failed');
        }
        finally {
            setIsLoading(false);
        }
    }, [apiService, scenario]);
    const selectedScenario = SCENARIOS.find(s => s.value === scenario);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 16 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "m", children: (0, jsx_runtime_1.jsx)("h2", { children: "IR Readiness Report" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", children: (0, jsx_runtime_1.jsx)("p", { children: "Phase-by-phase detection coverage for common threat scenarios, mapped against your rule library." }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "m", alignItems: "flexEnd", children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { style: { maxWidth: 320 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 4 }, children: "Threat Scenario" }), (0, jsx_runtime_1.jsx)(eui_1.EuiSelect, { options: SCENARIO_OPTIONS, value: scenario, onChange: e => { setScenario(e.target.value); setResult(null); setError(null); } })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiButton, { fill: true, iconType: "inspect", onClick: handleAnalyze, isLoading: isLoading, isDisabled: !scenario, children: "Analyze" }) })] }), selectedScenario && ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "s", color: "subdued", style: { marginTop: 6 }, children: (0, jsx_runtime_1.jsx)("p", { children: selectedScenario.description }) })), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), isLoading && ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { justifyContent: "center", style: { paddingTop: 60 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { grow: false, style: { textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "xl" }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "s" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "s", color: "subdued", children: ["Analyzing ", ruleCount, " rules\u2026"] })] }) })), error && !isLoading && ((0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: error, color: "warning", iconType: "warning" })), result && !isLoading && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "m", wrap: true, responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 140, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: result.total_rules_analyzed }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Rules analyzed" })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 140, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: [result.phases_covered, " / ", result.phases_total] }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Phases with coverage" })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 140, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: [result.overall_technique_coverage_pct, "%"] }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Technique coverage" })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { minWidth: 160, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { style: { fontWeight: 700, fontSize: 26 }, children: [result.total_covered_techniques, " / ", result.total_expected_techniques] }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Techniques covered" })] }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "l" }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "center", style: { maxWidth: 600 }, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 120 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "Overall coverage" }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { children: (0, jsx_runtime_1.jsx)("div", { style: { background: '#EBF0F5', borderRadius: 4, height: 10 }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                            background: result.overall_technique_coverage_pct >= 70 ? '#017D73'
                                                : result.overall_technique_coverage_pct >= 40 ? '#F5A700' : '#BD271E',
                                            borderRadius: 4, height: 10,
                                            width: `${result.overall_technique_coverage_pct}%`,
                                            transition: 'width 0.4s',
                                        } }) }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 36 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: [result.overall_technique_coverage_pct, "%"] }) })] }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "l" }), (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsxs)("h3", { children: ["Phase-by-Phase Coverage \u2014 ", result.scenario_display] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "m" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: result.phases.map((phase) => {
                            const covered = phase.has_technique_coverage;
                            const phasePct = phase.technique_coverage_pct;
                            const borderColor = covered ? PHASE_COLORS[phase.phase] ?? '#017D73' : '#D3DAE6';
                            const allRules = [...new Set([...phase.covering_rules, ...phase.tagged_rules])];
                            return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, paddingSize: "m", style: { borderLeft: `4px solid ${borderColor}` }, children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { alignItems: "flexStart", gutterSize: "m", responsive: false, children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 160 }, children: (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexGroup, { gutterSize: "s", alignItems: "center", children: [(0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 20 }, children: PHASE_ICONS[phase.phase] ?? '•' }) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { style: { fontWeight: 700, textTransform: 'capitalize', color: PHASE_COLORS[phase.phase] }, children: phase.phase.replace('-', '‑') }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: phase.description })] })] }) }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 160 }, children: phase.expected_techniques.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 4 }, children: [phase.covered_techniques.length, "/", phase.expected_techniques.length, " techniques \u00B7 ", phasePct, "%"] }), (0, jsx_runtime_1.jsx)("div", { style: { background: '#EBF0F5', borderRadius: 4, height: 8, width: 140 }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                                    background: covered ? (PHASE_COLORS[phase.phase] ?? '#017D73') : '#D3DAE6',
                                                                    borderRadius: 4, height: 8,
                                                                    width: `${phasePct}%`,
                                                                } }) })] })) : ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: "No specific techniques defined" })) }), (0, jsx_runtime_1.jsxs)(eui_1.EuiFlexItem, { children: [phase.covered_techniques.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 2 }, children: "Covered" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "xs", wrap: true, children: phase.covered_techniques.map(t => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "success", children: t }) }, t))) })] })), phase.missing_techniques.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [phase.covered_techniques.length > 0 && (0, jsx_runtime_1.jsx)(eui_1.EuiSpacer, { size: "xs" }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 2 }, children: "Missing" }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexGroup, { gutterSize: "xs", wrap: true, children: phase.missing_techniques.map(t => ((0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, children: (0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "danger", children: t }) }, t))) })] })), phase.expected_techniques.length === 0 && ((0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: phase.notes }))] }), (0, jsx_runtime_1.jsx)(eui_1.EuiFlexItem, { grow: false, style: { minWidth: 200 }, children: allRules.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", style: { marginBottom: 2 }, children: [allRules.length, " rule", allRules.length > 1 ? 's' : ''] }), allRules.slice(0, 4).map(r => ((0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", style: { marginBottom: 1 }, children: ["\u2022 ", r] }, r))), allRules.length > 4 && ((0, jsx_runtime_1.jsxs)(eui_1.EuiText, { size: "xs", color: "subdued", children: ["+", allRules.length - 4, " more"] }))] })) : ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "warning", iconType: "alert", children: "No rules" })) })] }), phase.notes && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(eui_1.EuiHorizontalRule, { margin: "xs" }), (0, jsx_runtime_1.jsx)(eui_1.EuiText, { size: "xs", color: "subdued", children: phase.notes })] }))] }, phase.phase));
                        }) })] }))] }));
};
exports.IrReadinessPanel = IrReadinessPanel;
//# sourceMappingURL=IrReadinessPanel.js.map