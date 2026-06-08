"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntaxHighlight = void 0;
exports.JsonHighlight = JsonHighlight;
exports.LuceneHighlight = LuceneHighlight;
const jsx_runtime_1 = require("react/jsx-runtime");
// Light-theme colors matching the screenshot style
const C = {
    key: '#032f62', // dark blue  — JSON object keys
    str: '#22863a', // green      — JSON string values
    num: '#e36209', // orange     — numbers
    kw: '#6f42c1', // purple     — true / false / null
    punct: '#586069', // gray       — { } [ ] , :
    field: '#0550ae', // blue       — Lucene field names
    op: '#6f42c1', // purple     — AND OR NOT
};
function tokenizeJson(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
        const rest = src.slice(i);
        // whitespace
        const ws = rest.match(/^[\s]+/);
        if (ws) {
            out.push({ t: 'ws', v: ws[0] });
            i += ws[0].length;
            continue;
        }
        // string
        if (src[i] === '"') {
            const m = rest.match(/^"(?:[^"\\]|\\.)*"/);
            if (m) {
                const s = m[0];
                const after = src.slice(i + s.length).match(/^\s*:/);
                out.push({ t: after ? 'key' : 'str', v: s });
                i += s.length;
                continue;
            }
        }
        // number
        const num = rest.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (num) {
            out.push({ t: 'num', v: num[0] });
            i += num[0].length;
            continue;
        }
        // keyword
        const kw = rest.match(/^(?:true|false|null)/);
        if (kw) {
            out.push({ t: 'kw', v: kw[0] });
            i += kw[0].length;
            continue;
        }
        // punctuation
        if ('{}[],:'.includes(src[i])) {
            out.push({ t: 'punct', v: src[i] });
            i++;
            continue;
        }
        // fallback
        out.push({ t: 'ws', v: src[i] });
        i++;
    }
    return out;
}
function colorForJTok(t) {
    if (t === 'key')
        return C.key;
    if (t === 'str')
        return C.str;
    if (t === 'num')
        return C.num;
    if (t === 'kw')
        return C.kw;
    if (t === 'punct')
        return C.punct;
    return undefined;
}
function JsonHighlight({ code }) {
    const tokens = tokenizeJson(code);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: tokens.map((tok, i) => ((0, jsx_runtime_1.jsx)("span", { style: { color: colorForJTok(tok.t) }, children: tok.v }, i))) }));
}
// ── Lucene query tokenizer ────────────────────────────────────────────────────
const LUCENE_RE = /("(?:[^"\\]|\\.)*")|([A-Za-z_.\-*?]+)(\s*:)(\s*)(\S*)|(\bAND\b|\bOR\b|\bNOT\b)|(\(|\)|\[|\]|\{|\})|(\S+)/g;
function LuceneHighlight({ code }) {
    const parts = [];
    let last = 0;
    let m;
    LUCENE_RE.lastIndex = 0;
    while ((m = LUCENE_RE.exec(code)) !== null) {
        if (m.index > last)
            parts.push(code.slice(last, m.index));
        last = m.index + m[0].length;
        if (m[1]) {
            // quoted string
            parts.push((0, jsx_runtime_1.jsx)("span", { style: { color: C.str }, children: m[1] }, last));
        }
        else if (m[2]) {
            // field:value
            parts.push((0, jsx_runtime_1.jsx)("span", { style: { color: C.field }, children: m[2] }, last + 'f'));
            parts.push((0, jsx_runtime_1.jsx)("span", { style: { color: C.punct }, children: m[3] }, last + 'c'));
            if (m[4])
                parts.push(m[4]);
            if (m[5])
                parts.push((0, jsx_runtime_1.jsx)("span", { style: { color: C.num }, children: m[5] }, last + 'v'));
        }
        else if (m[6]) {
            // AND/OR/NOT
            parts.push((0, jsx_runtime_1.jsx)("span", { style: { color: C.op, fontWeight: 600 }, children: m[6] }, last));
        }
        else {
            parts.push(m[0]);
        }
    }
    if (last < code.length)
        parts.push(code.slice(last));
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: parts });
}
const SyntaxHighlight = ({ code, format }) => {
    const isJson = ['dsl_lucene', 'siem_rule', 'siem_rule_ndjson', 'kibana_ndjson', 'elastalert'].includes(format);
    const isLucene = format === 'es-qs';
    if (isJson)
        return (0, jsx_runtime_1.jsx)(JsonHighlight, { code: code });
    if (isLucene)
        return (0, jsx_runtime_1.jsx)(LuceneHighlight, { code: code });
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: code });
};
exports.SyntaxHighlight = SyntaxHighlight;
//# sourceMappingURL=SyntaxHighlight.js.map