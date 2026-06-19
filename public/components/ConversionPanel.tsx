import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
  EuiText,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFieldNumber,
  EuiButtonEmpty,
  EuiAccordion,
  EuiCode,
} from '@elastic/eui';
import { TestRunResult, DeployResult, ClusterHitsResult } from '../types';

const FORMAT_OPTIONS = [
  { value: 'es-qs',            text: 'Lucene query string' },
  { value: 'dsl_lucene',       text: 'Query DSL' },
  { value: 'kibana_ndjson',    text: 'Kibana NDJSON' },
  { value: 'siem_rule',        text: 'SIEM Rule (JSON)' },
  { value: 'siem_rule_ndjson', text: 'SIEM Rule (NDJSON)' },
  { value: 'eql',              text: 'EQL' },
  { value: 'esql',             text: 'ES|QL' },
  { value: 'elastalert',       text: 'ElastAlert' },
];

const PIPELINE_LABELS: Record<string, string> = {
  ecs_windows:        'ECS Windows',
  ecs_windows_old:    'ECS Windows (old)',
  ecs_linux:          'ECS Linux',
  ecs_zeek_beats:     'ECS Zeek',
  ecs_zeek_corelight: 'ECS Zeek (Corelight)',
  zeek_raw:           'Zeek raw',
  ecs_kubernetes:     'ECS Kubernetes',
  ecs_macos_esf:      'ECS macOS',
};

const DISCOVER_FORMATS = new Set(['es-qs', 'eql', 'esql']);
const DISCOVER_LANGUAGE: Record<string, string> = {
  'es-qs': 'lucene',
  'eql':   'eql',
  'esql':  'esql',
};

// Only formats that map cleanly to an Elasticsearch query endpoint are testable:
// eql → /_eql/search, es-qs → /_search with query_string.
// dsl_lucene returns a JSON object (not a query string) so query_string rejects it.
// esql generates its own FROM clause and needs /_query — not yet supported.
const TESTABLE_FORMATS = new Set(['eql', 'es-qs']);
const DEPLOYABLE_FORMATS = new Set(['eql', 'esql', 'es-qs']);

function risonStr(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function buildDiscoverUrl(format: string, query: string): string {
  const language = DISCOVER_LANGUAGE[format];
  return `/app/discover#/?_a=(query:(language:${language},query:${risonStr(query)}))`;
}

function openInDiscover(format: string, query: string): void {
  const target = window !== window.parent ? window.parent : window;
  target.location.href = buildDiscoverUrl(format, query);
}

interface ConversionPanelProps {
  format: string;
  onFormatChange: (format: string) => void;
  result: string | null;
  error: string | null;
  isConverting: boolean;
  pipeline: string;
  hasRule: boolean;
  onTestRun: (params: { indexPattern: string; timeframeHours: number }) => void;
  testRunResult: TestRunResult | null;
  testRunError: string | null;
  isTestRunning: boolean;
  onDeploy: (params: { schedule?: string; enabled: boolean }) => void;
  deployResult: DeployResult | null;
  deployError: string | null;
  isDeploying: boolean;
  clusterHitsResult: ClusterHitsResult | null;
  clusterHitsError: string | null;
  isClusteringHits: boolean;
  onClusterHits: (testRunId: string) => void;
}

export const ConversionPanel: React.FC<ConversionPanelProps> = ({
  format,
  onFormatChange,
  result,
  error,
  isConverting,
  pipeline,
  hasRule,
  onTestRun,
  testRunResult,
  testRunError,
  isTestRunning,
  onDeploy,
  deployResult,
  deployError,
  isDeploying,
  clusterHitsResult,
  clusterHitsError,
  isClusteringHits,
  onClusterHits,
}) => {
  const [indexPattern, setIndexPattern] = useState('*');
  const [timeframeHours, setTimeframeHours] = useState(24);
  const [showBacktest, setShowBacktest] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployEnabled] = useState(false);

  const canOpenInDiscover = !!result && DISCOVER_FORMATS.has(format);
  const canRunBacktest   = !!result && TESTABLE_FORMATS.has(format);
  const canDeploy        = !!result && DEPLOYABLE_FORMATS.has(format);

  const handleCopy = useCallback(() => {
    if (result) navigator.clipboard.writeText(result).catch(() => {});
  }, [result]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <EuiTitle size="xs"><h3>Elasticsearch Output</h3></EuiTitle>
        </div>
        {hasRule && (
          <EuiBadge color="hollow">{PIPELINE_LABELS[pipeline] ?? pipeline}</EuiBadge>
        )}
      </div>

      {/* Format selector */}
      <div style={{ flexShrink: 0 }}>
        <EuiSelect
          fullWidth
          compressed
          options={FORMAT_OPTIONS}
          value={format}
          onChange={e => onFormatChange(e.target.value)}
          aria-label="Output format"
        />
      </div>

      {/* Action buttons */}
      {hasRule && result && (
        <div style={{ flexShrink: 0, marginTop: 8 }}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {canOpenInDiscover && (
              <EuiFlexItem>
                <EuiButton fullWidth size="s" iconType="discoverApp"
                  onClick={() => openInDiscover(format, result!)}>
                  Open in Discover
                </EuiButton>
              </EuiFlexItem>
            )}
            {canRunBacktest && (
              <EuiFlexItem>
                <EuiButton fullWidth size="s" iconType="play" color="success"
                  onClick={() => { setShowBacktest(v => !v); setShowDeploy(false); }}>
                  Backtest
                </EuiButton>
              </EuiFlexItem>
            )}
            {canDeploy && (
              <EuiFlexItem>
                <EuiButton fullWidth size="s" iconType="exportAction" color="primary"
                  onClick={() => { setShowDeploy(v => !v); setShowBacktest(false); }}>
                  Deploy
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      )}

      {/* Backtest panel */}
      {showBacktest && canRunBacktest && (
        <div style={{ flexShrink: 0, marginTop: 8, padding: '8px', backgroundColor: 'rgba(0,0,0,0.025)', borderRadius: 4 }}>
          <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem grow={3}>
              <EuiFieldText
                compressed
                placeholder="Index pattern (e.g. winlogbeat-*)"
                value={indexPattern}
                onChange={e => setIndexPattern(e.target.value)}
                prepend="Index"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFieldNumber
                compressed
                placeholder="24"
                value={timeframeHours}
                onChange={e => setTimeframeHours(Number(e.target.value))}
                min={1}
                max={2160}
                append="h"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isTestRunning}
                onClick={() => onTestRun({ indexPattern, timeframeHours })}
              >
                Run
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {testRunError && (
            <div style={{ marginTop: 6 }}>
              <EuiCallOut title="Backtest failed" color="danger" iconType="error" size="s">
                <p style={{ fontSize: '0.8em' }}>{testRunError}</p>
              </EuiCallOut>
            </div>
          )}

          {testRunResult && !testRunError && (
            <div style={{ marginTop: 6 }}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiBadge color={testRunResult.hit_count === 0 ? 'success' : testRunResult.hit_count > 1000 ? 'danger' : 'warning'}>
                    {testRunResult.hit_count.toLocaleString()} hits
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{testRunResult.timing_ms}ms</EuiBadge>
                </EuiFlexItem>
                {testRunResult.hit_count > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconType="aggregate"
                      isLoading={isClusteringHits}
                      onClick={() => onClusterHits(testRunResult.test_run_id)}
                    >
                      Cluster hits
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>

              {testRunResult.sample_events.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <EuiAccordion id="sample-events" buttonContent={
                    <EuiText size="xs" color="subdued"><span>Sample events ({testRunResult.sample_events.length})</span></EuiText>
                  }>
                    <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
                      {testRunResult.sample_events.slice(0, 5).map((evt, i) => (
                        <div key={i} style={{ marginBottom: 4 }}>
                          <EuiText size="xs" color="subdued"><span>{evt.timestamp}</span></EuiText>
                          <EuiCode language="json" transparentBackground>
                            {JSON.stringify(evt.source, null, 2).slice(0, 300)}
                          </EuiCode>
                        </div>
                      ))}
                    </div>
                  </EuiAccordion>
                </div>
              )}

              {clusterHitsError && (
                <div style={{ marginTop: 6 }}>
                  <EuiCallOut title="Cluster failed" color="danger" iconType="error" size="s">
                    <p style={{ fontSize: '0.8em' }}>{clusterHitsError}</p>
                  </EuiCallOut>
                </div>
              )}

              {clusterHitsResult && !clusterHitsError && (
                <div style={{ marginTop: 6 }}>
                  <EuiAccordion id="cluster-hits" initialIsOpen buttonContent={
                    <EuiText size="xs"><strong>Top contributing field values</strong></EuiText>
                  }>
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {clusterHitsResult.clusters.map((cf, ci) => (
                        <div key={ci} style={{ marginBottom: 8 }}>
                          <EuiText size="xs" color="subdued"><code>{cf.field}</code></EuiText>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                            {cf.buckets.map((b, bi) => (
                              <EuiBadge key={bi} color="hollow">
                                {b.value} ({b.count})
                              </EuiBadge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </EuiAccordion>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deploy panel */}
      {showDeploy && canDeploy && (
        <div style={{ flexShrink: 0, marginTop: 8, padding: '8px', backgroundColor: 'rgba(0,0,0,0.025)', borderRadius: 4 }}>
          <EuiText size="xs" color="subdued">
            <p>Creates a disabled detection rule in Elastic Security. Review and enable it there.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            fill
            isLoading={isDeploying}
            onClick={() => onDeploy({ enabled: deployEnabled })}
            iconType="exportAction"
          >
            Create Detection Rule
          </EuiButton>

          {deployError && (
            <div style={{ marginTop: 6 }}>
              <EuiCallOut title="Deploy failed" color="danger" iconType="error" size="s">
                <p style={{ fontSize: '0.8em' }}>{deployError}</p>
              </EuiCallOut>
            </div>
          )}

          {deployResult && !deployError && (
            <div style={{ marginTop: 6 }}>
              <EuiCallOut title="Rule created" color="success" iconType="check" size="s">
                <p style={{ fontSize: '0.8em' }}>
                  <strong>{deployResult.name}</strong> — ID: <code>{deployResult.rule_id}</code>
                </p>
              </EuiCallOut>
            </div>
          )}
        </div>
      )}

      {/* Output area */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 8, display: 'flex', flexDirection: 'column' }}>
        {!hasRule && (
          <EuiText color="subdued" size="s">
            <p>Fix YAML errors to enable conversion.</p>
          </EuiText>
        )}

        {hasRule && isConverting && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EuiLoadingSpinner size="l" />
          </div>
        )}

        {hasRule && !isConverting && error && (
          <EuiCallOut title="Conversion failed" color="danger" iconType="error" size="s">
            <p style={{ fontFamily: 'monospace', fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>{error}</p>
          </EuiCallOut>
        )}

        {hasRule && !isConverting && result && (
          <div style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.025)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            <pre style={{
              margin: 0,
              padding: '10px 12px',
              fontFamily: '"Roboto Mono", "Courier New", monospace',
              fontSize: '12.5px',
              lineHeight: '1.6',
              color: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              height: '100%',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}>
              {result}
            </pre>
            <EuiButtonIcon
              aria-label="Copy output"
              iconType="copyClipboard"
              size="s"
              onClick={handleCopy}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 4,
              }}
            />
          </div>
        )}
      </div>
    </EuiPanel>
  );
};
