"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutoPipeline = getAutoPipeline;
exports.useConversion = useConversion;
const react_1 = require("react");
function getAutoPipeline(logsource) {
    const product = (logsource?.product ?? '').toLowerCase();
    const category = (logsource?.category ?? '').toLowerCase();
    if (product === 'windows')
        return 'ecs_windows';
    if (product === 'linux')
        return 'ecs_linux';
    if (product === 'macos')
        return 'ecs_macos_esf';
    if (product === 'zeek' || category.includes('zeek'))
        return 'ecs_zeek_beats';
    if (product === 'kubernetes' || category.includes('kubernetes'))
        return 'ecs_kubernetes';
    return 'ecs_windows';
}
function decodeBase64(encoded) {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}
function useConversion(yaml, rule, format, apiService) {
    const [state, setState] = (0, react_1.useState)({
        result: null,
        error: null,
        isConverting: false,
        pipeline: 'ecs_windows',
    });
    const timerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!rule || !yaml.trim()) {
            setState(s => ({ ...s, result: null, error: null, isConverting: false }));
            return;
        }
        const pipeline = getAutoPipeline(rule.logsource);
        if (timerRef.current)
            clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setState(s => ({ ...s, isConverting: true, error: null, pipeline }));
            try {
                const res = await apiService.translateRule(yaml, format, pipeline);
                if (res.success && res.data?.translation) {
                    setState({ result: decodeBase64(res.data.translation), error: null, isConverting: false, pipeline });
                }
                else {
                    setState(s => ({ ...s, result: null, error: res.message ?? 'Conversion returned no output', isConverting: false, pipeline }));
                }
            }
            catch (e) {
                setState(s => ({ ...s, result: null, error: e instanceof Error ? e.message : 'Conversion failed', isConverting: false, pipeline }));
            }
        }, 600);
        return () => {
            if (timerRef.current)
                clearTimeout(timerRef.current);
        };
    }, [yaml, rule, format, apiService]);
    return state;
}
//# sourceMappingURL=useConversion.js.map