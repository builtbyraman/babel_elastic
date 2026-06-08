"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YamlEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const eui_1 = require("@elastic/eui");
const YamlEditor = ({ value, onChange, parseError, apiService }) => {
    var _a, _b;
    const handleChange = (0, react_1.useCallback)((e) => onChange(e.target.value), [onChange]);
    const textareaRef = (0, react_1.useRef)(null);
    const gutterRef = (0, react_1.useRef)(null);
    const syncGutter = (0, react_1.useCallback)(() => {
        if (gutterRef.current && textareaRef.current) {
            gutterRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);
    const lineCount = value ? value.split('\n').length : 1;
    const digitCount = Math.max(String(lineCount).length, 2);
    const errorLine = parseError
        ? parseInt((_b = ((_a = parseError.match(/\((\d+):\d+\)/)) !== null && _a !== void 0 ? _a : [])[1]) !== null && _b !== void 0 ? _b : '0', 10)
        : 0;
    const [validating, setValidating] = (0, react_1.useState)(false);
    const [issues, setIssues] = (0, react_1.useState)([]);
    const [validated, setValidated] = (0, react_1.useState)(false);
    const [quality, setQuality] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        setValidated(false);
        setIssues([]);
        setQuality(null);
    }, [value]);
    const handleValidate = (0, react_1.useCallback)(async () => {
        var _a;
        if (!apiService)
            return;
        setValidating(true);
        try {
            const result = await apiService.validateRule(value);
            setIssues((_a = result.issues) !== null && _a !== void 0 ? _a : []);
            setValidated(true);
            apiService.getRuleQuality(value).then((q) => setQuality(q)).catch(() => { });
        }
        catch {
            setIssues([{ type: 'error', rule: 'api_error', message: 'Validation service unavailable' }]);
            setValidated(true);
        }
        finally {
            setValidating(false);
        }
    }, [apiService, value]);
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    const qualityColor = quality
        ? quality.score >= 80 ? 'success' : quality.score >= 60 ? 'warning' : 'danger'
        : 'default';
    return ((0, jsx_runtime_1.jsxs)(eui_1.EuiPanel, { hasBorder: true, hasShadow: false, paddingSize: "s", style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flex: 1 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiTitle, { size: "xs", children: (0, jsx_runtime_1.jsx)("h3", { children: "YAML Editor" }) }) }), quality && ((0, jsx_runtime_1.jsx)(eui_1.EuiToolTip, { content: quality.reasons.length > 0 ? quality.reasons.join(' · ') : 'No issues found', children: (0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: qualityColor, style: { marginRight: 6, cursor: 'default' }, children: ["Q: ", quality.score] }) })), parseError ? ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "danger", children: "Parse Error" })) : validated ? (errors.length > 0 ? ((0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "danger", children: [errors.length, " error", errors.length > 1 ? 's' : ''] })) : warnings.length > 0 ? ((0, jsx_runtime_1.jsxs)(eui_1.EuiBadge, { color: "warning", children: [warnings.length, " warning", warnings.length > 1 ? 's' : ''] })) : ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "success", children: "Valid" }))) : ((0, jsx_runtime_1.jsx)(eui_1.EuiBadge, { color: "default", children: "Not validated" })), apiService && ((0, jsx_runtime_1.jsx)(eui_1.EuiButtonEmpty, { size: "xs", iconType: validating ? undefined : 'check', onClick: handleValidate, disabled: validating || !!parseError, style: { marginLeft: 8 }, children: validating ? (0, jsx_runtime_1.jsx)(eui_1.EuiLoadingSpinner, { size: "s" }) : 'Validate' }))] }), parseError && ((0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, marginBottom: 8 }, children: (0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: parseError, color: "danger", iconType: "error", size: "s" }) })), validated && issues.length > 0 && ((0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, marginBottom: 8, maxHeight: 120, overflowY: 'auto' }, children: issues.map((issue, i) => ((0, jsx_runtime_1.jsx)(eui_1.EuiCallOut, { title: issue.message, color: issue.type === 'error' ? 'danger' : 'warning', iconType: issue.type === 'error' ? 'error' : 'warning', size: "s", style: { marginBottom: 4 } }, i))) })), (0, jsx_runtime_1.jsxs)("div", { style: {
                    flex: 1,
                    minHeight: 0,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.025)',
                    overflow: 'hidden',
                    display: 'flex',
                }, children: [(0, jsx_runtime_1.jsx)("div", { ref: gutterRef, "aria-hidden": true, style: {
                            flexShrink: 0,
                            overflow: 'hidden',
                            userSelect: 'none',
                            width: `calc(${digitCount}ch + 20px)`,
                            fontFamily: '"Roboto Mono", "Courier New", monospace',
                            fontSize: '13px',
                            lineHeight: '1.7',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            paddingRight: '8px',
                            textAlign: 'right',
                            color: 'rgba(128,128,128,0.5)',
                            borderRight: '1px solid rgba(128,128,128,0.2)',
                            backgroundColor: 'rgba(0,0,0,0.03)',
                        }, children: Array.from({ length: lineCount }, (_, i) => i + 1).map(n => ((0, jsx_runtime_1.jsx)("div", { style: n === errorLine ? { color: 'var(--euiColorDanger, #e74c3c)', fontWeight: 600 } : undefined, children: n }, n))) }), (0, jsx_runtime_1.jsx)("textarea", { ref: textareaRef, onScroll: syncGutter, value: value, onChange: handleChange, spellCheck: false, "aria-label": "SIGMA rule YAML", style: {
                            flex: 1,
                            height: '100%',
                            fontFamily: '"Roboto Mono", "Courier New", monospace',
                            fontSize: '13px',
                            lineHeight: '1.7',
                            resize: 'none',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            padding: '10px 12px',
                            boxSizing: 'border-box',
                            whiteSpace: 'pre',
                            overflowWrap: 'normal',
                            overflowX: 'auto',
                            overflowY: 'auto',
                        } })] })] }));
};
exports.YamlEditor = YamlEditor;
//# sourceMappingURL=YamlEditor.js.map