import React from 'react';

// Light-theme colors matching the screenshot style
const C = {
  key:   '#032f62', // dark blue  — JSON object keys
  str:   '#22863a', // green      — JSON string values
  num:   '#e36209', // orange     — numbers
  kw:    '#6f42c1', // purple     — true / false / null
  punct: '#586069', // gray       — { } [ ] , :
  field: '#0550ae', // blue       — Lucene field names
  op:    '#6f42c1', // purple     — AND OR NOT
};

// ── JSON tokenizer ────────────────────────────────────────────────────────────

type JTok = { t: 'key' | 'str' | 'num' | 'kw' | 'punct' | 'ws'; v: string };

function tokenizeJson(src: string): JTok[] {
  const out: JTok[] = [];
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);

    // whitespace
    const ws = rest.match(/^[\s]+/);
    if (ws) { out.push({ t: 'ws', v: ws[0] }); i += ws[0].length; continue; }

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
    if (num) { out.push({ t: 'num', v: num[0] }); i += num[0].length; continue; }

    // keyword
    const kw = rest.match(/^(?:true|false|null)/);
    if (kw) { out.push({ t: 'kw', v: kw[0] }); i += kw[0].length; continue; }

    // punctuation
    if ('{}[],:'.includes(src[i])) { out.push({ t: 'punct', v: src[i] }); i++; continue; }

    // fallback
    out.push({ t: 'ws', v: src[i] }); i++;
  }

  return out;
}

function colorForJTok(t: JTok['t']): string | undefined {
  if (t === 'key')   return C.key;
  if (t === 'str')   return C.str;
  if (t === 'num')   return C.num;
  if (t === 'kw')    return C.kw;
  if (t === 'punct') return C.punct;
  return undefined;
}

export function JsonHighlight({ code }: { code: string }) {
  const tokens = tokenizeJson(code);
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: colorForJTok(tok.t) }}>{tok.v}</span>
      ))}
    </>
  );
}

// ── Lucene query tokenizer ────────────────────────────────────────────────────

const LUCENE_RE = /("(?:[^"\\]|\\.)*")|([A-Za-z_.\-*?]+)(\s*:)(\s*)(\S*)|(\bAND\b|\bOR\b|\bNOT\b)|(\(|\)|\[|\]|\{|\})|(\S+)/g;

export function LuceneHighlight({ code }: { code: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LUCENE_RE.lastIndex = 0;

  while ((m = LUCENE_RE.exec(code)) !== null) {
    if (m.index > last) parts.push(code.slice(last, m.index));
    last = m.index + m[0].length;

    if (m[1]) {
      // quoted string
      parts.push(<span key={last} style={{ color: C.str }}>{m[1]}</span>);
    } else if (m[2]) {
      // field:value
      parts.push(<span key={last + 'f'} style={{ color: C.field }}>{m[2]}</span>);
      parts.push(<span key={last + 'c'} style={{ color: C.punct }}>{m[3]}</span>);
      if (m[4]) parts.push(m[4]);
      if (m[5]) parts.push(<span key={last + 'v'} style={{ color: C.num }}>{m[5]}</span>);
    } else if (m[6]) {
      // AND/OR/NOT
      parts.push(<span key={last} style={{ color: C.op, fontWeight: 600 }}>{m[6]}</span>);
    } else {
      parts.push(m[0]);
    }
  }

  if (last < code.length) parts.push(code.slice(last));
  return <>{parts}</>;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

interface SyntaxHighlightProps {
  code: string;
  format: string;
}

export const SyntaxHighlight: React.FC<SyntaxHighlightProps> = ({ code, format }) => {
  const isJson = ['dsl_lucene', 'siem_rule', 'siem_rule_ndjson', 'kibana_ndjson', 'elastalert'].includes(format);
  const isLucene = format === 'es-qs';

  if (isJson) return <JsonHighlight code={code} />;
  if (isLucene) return <LuceneHighlight code={code} />;
  return <>{code}</>;
};
