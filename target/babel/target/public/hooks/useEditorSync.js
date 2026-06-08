"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEditorSync = useEditorSync;
const react_1 = require("react");
const js_yaml_1 = __importDefault(require("js-yaml"));
function parseRule(text) {
    try {
        if (!text.trim())
            return { rule: null, error: 'Empty rule' };
        const parsed = js_yaml_1.default.load(text);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { rule: null, error: 'Root must be a YAML mapping' };
        }
        return { rule: parsed, error: null };
    }
    catch (e) {
        return { rule: null, error: e instanceof Error ? e.message : 'YAML parse error' };
    }
}
function dumpRule(rule) {
    return js_yaml_1.default.dump(rule, { indent: 4, lineWidth: -1, noRefs: true });
}
function useEditorSync(initialYaml) {
    const [state, setState] = (0, react_1.useState)(() => {
        const { rule, error } = parseRule(initialYaml);
        return { yaml: initialYaml, rule, parseError: error };
    });
    const setYaml = (0, react_1.useCallback)((value) => {
        const { rule, error } = parseRule(value);
        setState({ yaml: value, rule, parseError: error });
    }, []);
    const updateRule = (0, react_1.useCallback)((patch) => {
        setState(prev => {
            const merged = { ...prev.rule, ...patch };
            return { yaml: dumpRule(merged), rule: merged, parseError: null };
        });
    }, []);
    return [state, { setYaml, updateRule }];
}
//# sourceMappingURL=useEditorSync.js.map