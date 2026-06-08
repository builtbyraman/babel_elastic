import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFieldSearch,
  EuiSelect,
  EuiSpacer,
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButtonEmpty,
} from '@elastic/eui';
import yaml from 'js-yaml';
import { ApiService } from '../services/api';

const PAGE_SIZE = 20;

const STRIP_FIELDS = new Set(['_path', '_synced_at', '_source_repo', '_repo_slug', '_repo_name']);

const TACTIC_LABELS: Record<string, string> = {
  'reconnaissance':        'Reconnaissance',
  'resource-development':  'Resource Development',
  'initial-access':        'Initial Access',
  'execution':             'Execution',
  'persistence':           'Persistence',
  'privilege-escalation':  'Privilege Escalation',
  'defense-evasion':       'Defense Evasion',
  'credential-access':     'Credential Access',
  'discovery':             'Discovery',
  'lateral-movement':      'Lateral Movement',
  'collection':            'Collection',
  'command-and-control':   'Command and Control',
  'exfiltration':          'Exfiltration',
  'impact':                'Impact',
};

const TACTIC_COLORS: Record<string, string> = {
  'reconnaissance':       '#74b9ff',
  'resource-development': '#a29bfe',
  'initial-access':       '#fd79a8',
  'execution':            '#e17055',
  'persistence':          '#fdcb6e',
  'privilege-escalation': '#e84393',
  'defense-evasion':      '#6c5ce7',
  'credential-access':    '#d63031',
  'discovery':            '#00b894',
  'lateral-movement':     '#0984e3',
  'collection':           '#00cec9',
  'command-and-control':  '#b2bec3',
  'exfiltration':         '#fab1a0',
  'impact':               '#ff7675',
};

const MITRE_TACTIC_OPTIONS = [
  { value: '', text: 'All tactics' },
  ...Object.entries(TACTIC_LABELS).map(([value, text]) => ({ value, text })),
];

const IR_PHASE_OPTIONS = [
  { value: '', text: 'All IR phases' },
  { value: 'preparation',   text: 'Preparation' },
  { value: 'detection',     text: 'Detection' },
  { value: 'containment',   text: 'Containment' },
  { value: 'eradication',   text: 'Eradication' },
  { value: 'recovery',      text: 'Recovery' },
  { value: 'post-incident', text: 'Post-Incident' },
];

const IR_PHASE_COLORS: Record<string, string> = {
  preparation:    '#006BB4',
  detection:      '#6c5ce7',
  containment:    '#e17055',
  eradication:    '#d63031',
  recovery:       '#00b894',
  'post-incident':'#636e72',
};

interface MitreParsed { tactics: string[]; techniques: string[]; }

function parseMitre(tags: unknown): MitreParsed {
  const result: MitreParsed = { tactics: [], techniques: [] };
  if (!Array.isArray(tags)) return result;
  for (const tag of tags) {
    if (typeof tag !== 'string' || !tag.startsWith('attack.')) continue;
    const val = tag.slice('attack.'.length);
    if (/^t\d{4}(\.\d+)?$/i.test(val)) {
      result.techniques.push(val.toUpperCase());
    } else if (TACTIC_LABELS[val]) {
      result.tactics.push(val);
    }
  }
  return result;
}

function fixDates(val: unknown): unknown {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) return val.split('T')[0];
  if (Array.isArray(val)) return val.map(fixDates);
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, fixDates(v)])
    );
  }
  return val;
}

function docToYaml(doc: Record<string, unknown>): string {
  const stripped = Object.fromEntries(
    Object.entries(doc).filter(([k]) => !STRIP_FIELDS.has(k))
  );
  const clean = fixDates(stripped) as Record<string, unknown>;
  return yaml.dump(clean, { indent: 4, lineWidth: -1, noRefs: true });
}

const LEVEL_COLORS: Record<string, string> = {
  critical: 'danger', high: 'warning', medium: 'primary',
  low: 'default', informational: 'subdued',
};

interface RuleSelectorProps {
  onClose: () => void;
  onSelect: (yamlContent: string) => void;
  apiService: ApiService;
}

export const RuleSelector: React.FC<RuleSelectorProps> = ({ onClose, onSelect, apiService }) => {
  const [search, setSearch] = useState('');
  const [mitreFilter, setMitreFilter] = useState('');
  const [irPhaseFilter, setIrPhaseFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);

  const fetchRules = useCallback(async (q: string, mitre: string, irPhase: string, page: number) => {
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
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    fetchRules(search, mitreFilter, irPhaseFilter, pageIndex);
  }, [fetchRules, search, mitreFilter, irPhaseFilter, pageIndex]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPageIndex(0);
  }, []);

  const handleMitreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMitreFilter(e.target.value);
    setPageIndex(0);
  }, []);

  const handleIrPhaseChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setIrPhaseFilter(e.target.value);
    setPageIndex(0);
  }, []);

  const handleSelect = useCallback((doc: Record<string, unknown>) => {
    onSelect(docToYaml(doc));
    onClose();
  }, [onSelect, onClose]);

  const columns = [
    {
      field: 'title',
      name: 'Title',
      render: (title: unknown, doc: Record<string, unknown>) => (
        <div>
          <EuiButtonEmpty size="xs" flush="left" onClick={() => handleSelect(doc)}>
            {String(title ?? '(untitled)')}
          </EuiButtonEmpty>
          {(() => {
            const { techniques } = parseMitre(doc.tags);
            const irPhase = doc['x-ir-phase'] as string | undefined;
            if (techniques.length === 0 && !irPhase) return null;
            const shown = techniques.slice(0, 3);
            const extra = techniques.length - shown.length;
            return (
              <div style={{ paddingLeft: 8, paddingBottom: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {shown.map(t => (
                  <EuiBadge key={t} color="hollow" style={{ marginRight: 2, fontSize: '0.65rem' }}>{t}</EuiBadge>
                ))}
                {extra > 0 && <EuiBadge color="hollow" style={{ fontSize: '0.65rem' }}>+{extra}</EuiBadge>}
                {irPhase && (
                  <EuiBadge style={{ backgroundColor: IR_PHASE_COLORS[irPhase] ?? '#636e72', color: '#fff', fontSize: '0.62rem' }}>
                    {irPhase}
                  </EuiBadge>
                )}
              </div>
            );
          })()}
        </div>
      ),
    },
    {
      field: 'tags',
      name: 'Tactic',
      width: '160px',
      render: (tags: unknown) => {
        const { tactics } = parseMitre(tags);
        if (tactics.length === 0) return <EuiText size="xs" color="subdued">—</EuiText>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {tactics.slice(0, 2).map(t => (
              <EuiBadge
                key={t}
                style={{
                  backgroundColor: TACTIC_COLORS[t] ?? '#b2bec3',
                  color: '#fff',
                  fontSize: '0.62rem',
                }}
              >
                {TACTIC_LABELS[t]}
              </EuiBadge>
            ))}
            {tactics.length > 2 && (
              <EuiBadge color="hollow" style={{ fontSize: '0.62rem' }}>+{tactics.length - 2}</EuiBadge>
            )}
          </div>
        );
      },
    },
    {
      field: 'level',
      name: 'Severity',
      width: '80px',
      render: (level: unknown) =>
        level ? (
          <EuiBadge color={(LEVEL_COLORS[String(level)] ?? 'default') as any}>
            {String(level)}
          </EuiBadge>
        ) : null,
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="l" aria-labelledby="ruleSelectorTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m"><h2 id="ruleSelectorTitle">Select Rule</h2></EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder="Search title, description, technique ID…"
              value={search}
              onChange={handleSearchChange}
              isClearable
              isLoading={isLoading}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 180 }}>
            <EuiSelect
              options={MITRE_TACTIC_OPTIONS}
              value={mitreFilter}
              onChange={handleMitreChange}
              aria-label="Filter by MITRE tactic"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
            <EuiSelect
              options={IR_PHASE_OPTIONS}
              value={irPhaseFilter}
              onChange={handleIrPhaseChange}
              aria-label="Filter by IR phase"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {isLoading && docs.length === 0 ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}><EuiLoadingSpinner size="xl" /></EuiFlexItem>
          </EuiFlexGroup>
        ) : docs.length === 0 ? (
          <EuiText color="subdued" textAlign="center">
            <p>No rules found. {!search && !mitreFilter ? 'Use "Sync Rules" to import from GitHub.' : 'Try a different search or filter.'}</p>
          </EuiText>
        ) : (
          <>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 8 }}>
              {total.toLocaleString()} rule{total !== 1 ? 's' : ''}
              {mitreFilter ? ` · ${TACTIC_LABELS[mitreFilter]}` : ''}
              {irPhaseFilter ? ` · IR: ${irPhaseFilter}` : ''}
            </EuiText>
            <EuiBasicTable
              items={docs as any[]}
              columns={columns as any[]}
              pagination={{
                pageIndex,
                pageSize: PAGE_SIZE,
                totalItemCount: total,
                showPerPageOptions: false,
              }}
              onChange={({ page }: any) => setPageIndex(page?.index ?? 0)}
            />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
