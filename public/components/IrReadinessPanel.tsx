import React, { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ApiService } from '../services/api';

const SCENARIOS = [
  { value: 'ransomware',       label: 'Ransomware',       description: 'File-encrypting ransomware (LockBit, BlackCat, ALPHV)' },
  { value: 'credential_theft', label: 'Credential Theft', description: 'LSASS dumping, Kerberoasting, Pass-the-Hash' },
  { value: 'lateral_movement', label: 'Lateral Movement', description: 'Internal pivoting via RDP, SMB, WMI' },
  { value: 'insider_threat',   label: 'Insider Threat',   description: 'Data collection and exfiltration by malicious insider' },
];

const SCENARIO_OPTIONS = [
  { value: '', text: '— select a scenario —' },
  ...SCENARIOS.map(s => ({ value: s.value, text: s.label })),
];

const PHASE_ICONS: Record<string, string> = {
  preparation:    '🛡',
  detection:      '🔍',
  containment:    '🚧',
  eradication:    '🧹',
  recovery:       '♻',
  'post-incident':'📋',
};

const PHASE_COLORS: Record<string, string> = {
  preparation:    '#006BB4',
  detection:      '#6c5ce7',
  containment:    '#e17055',
  eradication:    '#d63031',
  recovery:       '#00b894',
  'post-incident':'#636e72',
};

interface PhaseResult {
  phase: string;
  description: string;
  notes: string;
  expected_techniques: string[];
  covered_techniques: string[];
  missing_techniques: string[];
  technique_coverage_pct: number;
  has_technique_coverage: boolean;
  covering_rules: string[];
  tagged_rules: string[];
  has_tagged_rules: boolean;
  rule_count: number;
}

interface IrReadinessResult {
  scenario: string;
  scenario_display: string;
  scenario_description: string;
  total_rules_analyzed: number;
  phases: PhaseResult[];
  phases_covered: number;
  phases_total: number;
  overall_technique_coverage_pct: number;
  total_expected_techniques: number;
  total_covered_techniques: number;
}

function buildRuleYamls(docs: any[]): string[] {
  return docs.map((doc: any) => {
    const tags: string[] = Array.isArray(doc.tags) ? doc.tags : [];
    const title = String(doc.title ?? 'Unknown').replace(/"/g, '\\"');
    const irPhase = doc['x-ir-phase'] ? `x-ir-phase: ${doc['x-ir-phase']}\n` : '';
    const tagsSection = tags.length > 0
      ? `tags:\n${tags.map((t: string) => `  - ${String(t)}`).join('\n')}\n`
      : '';
    return `title: "${title}"\nstatus: test\n${tagsSection}${irPhase}`;
  });
}

interface IrReadinessPanelProps {
  apiService: ApiService;
}

export const IrReadinessPanel: React.FC<IrReadinessPanelProps> = ({ apiService }) => {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<IrReadinessResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleCount, setRuleCount] = useState(0);

  const handleAnalyze = useCallback(async () => {
    if (!scenario) return;
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
      const docs: any[] = res?.data?.docs ?? [];
      setRuleCount(total);

      const ruleYamls = buildRuleYamls(docs);
      const data = await apiService.irReadiness(scenario, ruleYamls) as unknown as IrReadinessResult;
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'IR readiness analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [apiService, scenario]);

  const selectedScenario = SCENARIOS.find(s => s.value === scenario);

  return (
    <div style={{ padding: 16 }}>
      <EuiTitle size="m"><h2>IR Readiness Report</h2></EuiTitle>
      <EuiText size="s" color="subdued">
        <p>Phase-by-phase detection coverage for common threat scenarios, mapped against your rule library.</p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
        <EuiFlexItem style={{ maxWidth: 320 }}>
          <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>Threat Scenario</EuiText>
          <EuiSelect
            options={SCENARIO_OPTIONS}
            value={scenario}
            onChange={e => { setScenario(e.target.value); setResult(null); setError(null); }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="inspect"
            onClick={handleAnalyze}
            isLoading={isLoading}
            isDisabled={!scenario}
          >
            Analyze
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {selectedScenario && (
        <EuiText size="s" color="subdued" style={{ marginTop: 6 }}>
          <p>{selectedScenario.description}</p>
        </EuiText>
      )}

      <EuiSpacer size="m" />

      {isLoading && (
        <EuiFlexGroup justifyContent="center" style={{ paddingTop: 60 }}>
          <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
            <EuiLoadingSpinner size="xl" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">Analyzing {ruleCount} rules…</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {error && !isLoading && (
        <EuiCallOut title={error} color="warning" iconType="warning" />
      )}

      {result && !isLoading && (
        <>
          <EuiFlexGroup gutterSize="m" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 140, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{result.total_rules_analyzed}</EuiText>
                <EuiText size="xs" color="subdued">Rules analyzed</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 140, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{result.phases_covered} / {result.phases_total}</EuiText>
                <EuiText size="xs" color="subdued">Phases with coverage</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 140, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{result.overall_technique_coverage_pct}%</EuiText>
                <EuiText size="xs" color="subdued">Technique coverage</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 160, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{result.total_covered_techniques} / {result.total_expected_techniques}</EuiText>
                <EuiText size="xs" color="subdued">Techniques covered</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="s" alignItems="center" style={{ maxWidth: 600 }}>
            <EuiFlexItem grow={false} style={{ minWidth: 120 }}>
              <EuiText size="xs" color="subdued">Overall coverage</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <div style={{ background: '#EBF0F5', borderRadius: 4, height: 10 }}>
                <div style={{
                  background: result.overall_technique_coverage_pct >= 70 ? '#017D73'
                    : result.overall_technique_coverage_pct >= 40 ? '#F5A700' : '#BD271E',
                  borderRadius: 4, height: 10,
                  width: `${result.overall_technique_coverage_pct}%`,
                  transition: 'width 0.4s',
                }} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 36 }}>
              <EuiText size="xs" color="subdued">{result.overall_technique_coverage_pct}%</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiTitle size="xs"><h3>Phase-by-Phase Coverage — {result.scenario_display}</h3></EuiTitle>
          <EuiSpacer size="m" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.phases.map((phase) => {
              const covered = phase.has_technique_coverage;
              const phasePct = phase.technique_coverage_pct;
              const borderColor = covered ? PHASE_COLORS[phase.phase] ?? '#017D73' : '#D3DAE6';
              const allRules = [...new Set([...phase.covering_rules, ...phase.tagged_rules])];

              return (
                <EuiPanel
                  key={phase.phase}
                  hasBorder
                  paddingSize="m"
                  style={{ borderLeft: `4px solid ${borderColor}` }}
                >
                  <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <span style={{ fontSize: 20 }}>{PHASE_ICONS[phase.phase] ?? '•'}</span>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText style={{ fontWeight: 700, textTransform: 'capitalize', color: PHASE_COLORS[phase.phase] }}>
                            {phase.phase.replace('-', '‑')}
                          </EuiText>
                          <EuiText size="xs" color="subdued">{phase.description}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
                      {phase.expected_techniques.length > 0 ? (
                        <>
                          <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                            {phase.covered_techniques.length}/{phase.expected_techniques.length} techniques · {phasePct}%
                          </EuiText>
                          <div style={{ background: '#EBF0F5', borderRadius: 4, height: 8, width: 140 }}>
                            <div style={{
                              background: covered ? (PHASE_COLORS[phase.phase] ?? '#017D73') : '#D3DAE6',
                              borderRadius: 4, height: 8,
                              width: `${phasePct}%`,
                            }} />
                          </div>
                        </>
                      ) : (
                        <EuiText size="xs" color="subdued">No specific techniques defined</EuiText>
                      )}
                    </EuiFlexItem>

                    <EuiFlexItem>
                      {phase.covered_techniques.length > 0 && (
                        <div>
                          <EuiText size="xs" color="subdued" style={{ marginBottom: 2 }}>Covered</EuiText>
                          <EuiFlexGroup gutterSize="xs" wrap>
                            {phase.covered_techniques.map(t => (
                              <EuiFlexItem key={t} grow={false}>
                                <EuiBadge color="success">{t}</EuiBadge>
                              </EuiFlexItem>
                            ))}
                          </EuiFlexGroup>
                        </div>
                      )}
                      {phase.missing_techniques.length > 0 && (
                        <>
                          {phase.covered_techniques.length > 0 && <EuiSpacer size="xs" />}
                          <EuiText size="xs" color="subdued" style={{ marginBottom: 2 }}>Missing</EuiText>
                          <EuiFlexGroup gutterSize="xs" wrap>
                            {phase.missing_techniques.map(t => (
                              <EuiFlexItem key={t} grow={false}>
                                <EuiBadge color="danger">{t}</EuiBadge>
                              </EuiFlexItem>
                            ))}
                          </EuiFlexGroup>
                        </>
                      )}
                      {phase.expected_techniques.length === 0 && (
                        <EuiText size="xs" color="subdued">{phase.notes}</EuiText>
                      )}
                    </EuiFlexItem>

                    <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                      {allRules.length > 0 ? (
                        <>
                          <EuiText size="xs" color="subdued" style={{ marginBottom: 2 }}>
                            {allRules.length} rule{allRules.length > 1 ? 's' : ''}
                          </EuiText>
                          {allRules.slice(0, 4).map(r => (
                            <EuiText key={r} size="xs" style={{ marginBottom: 1 }}>• {r}</EuiText>
                          ))}
                          {allRules.length > 4 && (
                            <EuiText size="xs" color="subdued">+{allRules.length - 4} more</EuiText>
                          )}
                        </>
                      ) : (
                        <EuiBadge color="warning" iconType="alert">No rules</EuiBadge>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {phase.notes && (
                    <>
                      <EuiHorizontalRule margin="xs" />
                      <EuiText size="xs" color="subdued">{phase.notes}</EuiText>
                    </>
                  )}
                </EuiPanel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
