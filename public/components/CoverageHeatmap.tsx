import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiPanel,
} from '@elastic/eui';
import { ApiService } from '../services/api';
import { CoverageResult } from '../types';

const TACTIC_ORDER = [
  'reconnaissance', 'resource_development', 'initial_access', 'execution',
  'persistence', 'privilege_escalation', 'defense_evasion', 'credential_access',
  'discovery', 'lateral_movement', 'collection', 'command_and_control',
  'exfiltration', 'impact',
];

const TACTIC_LABELS: Record<string, string> = {
  reconnaissance:       'Reconnaissance',
  resource_development: 'Resource Development',
  initial_access:       'Initial Access',
  execution:            'Execution',
  persistence:          'Persistence',
  privilege_escalation: 'Privilege Escalation',
  defense_evasion:      'Defense Evasion',
  credential_access:    'Credential Access',
  discovery:            'Discovery',
  lateral_movement:     'Lateral Movement',
  collection:           'Collection',
  command_and_control:  'Command & Control',
  exfiltration:         'Exfiltration',
  impact:               'Impact',
};

const TECHNIQUE_MAP: Record<string, [string, string]> = {
  'T1059':     ['Command and Scripting Interpreter', 'execution'],
  'T1059.001': ['PowerShell', 'execution'],
  'T1059.002': ['AppleScript', 'execution'],
  'T1059.003': ['Windows Command Shell', 'execution'],
  'T1059.004': ['Unix Shell', 'execution'],
  'T1059.005': ['Visual Basic', 'execution'],
  'T1059.006': ['Python', 'execution'],
  'T1059.007': ['JavaScript', 'execution'],
  'T1204':     ['User Execution', 'execution'],
  'T1204.001': ['Malicious Link', 'execution'],
  'T1204.002': ['Malicious File', 'execution'],
  'T1106':     ['Native API', 'execution'],
  'T1053':     ['Scheduled Task/Job', 'execution'],
  'T1053.005': ['Scheduled Task', 'execution'],
  'T1569':     ['System Services', 'execution'],
  'T1569.002': ['Service Execution', 'execution'],
  'T1047':     ['Windows Management Instrumentation', 'execution'],
  'T1546':     ['Event Triggered Execution', 'persistence'],
  'T1547':     ['Boot or Logon Autostart Execution', 'persistence'],
  'T1547.001': ['Registry Run Keys / Startup Folder', 'persistence'],
  'T1543':     ['Create or Modify System Process', 'persistence'],
  'T1543.003': ['Windows Service', 'persistence'],
  'T1136':     ['Create Account', 'persistence'],
  'T1136.001': ['Local Account', 'persistence'],
  'T1136.002': ['Domain Account', 'persistence'],
  'T1098':     ['Account Manipulation', 'persistence'],
  'T1505':     ['Server Software Component', 'persistence'],
  'T1505.003': ['Web Shell', 'persistence'],
  'T1548':     ['Abuse Elevation Control Mechanism', 'privilege_escalation'],
  'T1548.002': ['Bypass User Account Control', 'privilege_escalation'],
  'T1134':     ['Access Token Manipulation', 'privilege_escalation'],
  'T1134.001': ['Token Impersonation/Theft', 'privilege_escalation'],
  'T1055':     ['Process Injection', 'privilege_escalation'],
  'T1055.001': ['Dynamic-link Library Injection', 'privilege_escalation'],
  'T1055.012': ['Process Hollowing', 'privilege_escalation'],
  'T1027':     ['Obfuscated Files or Information', 'defense_evasion'],
  'T1027.001': ['Binary Padding', 'defense_evasion'],
  'T1036':     ['Masquerading', 'defense_evasion'],
  'T1036.003': ['Rename System Utilities', 'defense_evasion'],
  'T1036.005': ['Match Legitimate Name or Location', 'defense_evasion'],
  'T1070':     ['Indicator Removal', 'defense_evasion'],
  'T1070.001': ['Clear Windows Event Logs', 'defense_evasion'],
  'T1070.004': ['File Deletion', 'defense_evasion'],
  'T1112':     ['Modify Registry', 'defense_evasion'],
  'T1218':     ['System Binary Proxy Execution', 'defense_evasion'],
  'T1218.001': ['Compiled HTML File', 'defense_evasion'],
  'T1218.005': ['Mshta', 'defense_evasion'],
  'T1218.007': ['Msiexec', 'defense_evasion'],
  'T1218.010': ['Regsvr32', 'defense_evasion'],
  'T1218.011': ['Rundll32', 'defense_evasion'],
  'T1562':     ['Impair Defenses', 'defense_evasion'],
  'T1562.001': ['Disable or Modify Tools', 'defense_evasion'],
  'T1562.002': ['Disable Windows Event Logging', 'defense_evasion'],
  'T1574':     ['Hijack Execution Flow', 'defense_evasion'],
  'T1574.002': ['DLL Side-Loading', 'defense_evasion'],
  'T1003':     ['OS Credential Dumping', 'credential_access'],
  'T1003.001': ['LSASS Memory', 'credential_access'],
  'T1003.002': ['Security Account Manager', 'credential_access'],
  'T1003.003': ['NTDS', 'credential_access'],
  'T1552':     ['Unsecured Credentials', 'credential_access'],
  'T1552.001': ['Credentials In Files', 'credential_access'],
  'T1557':     ['Adversary-in-the-Middle', 'credential_access'],
  'T1110':     ['Brute Force', 'credential_access'],
  'T1558':     ['Steal or Forge Kerberos Tickets', 'credential_access'],
  'T1558.003': ['Kerberoasting', 'credential_access'],
  'T1082':     ['System Information Discovery', 'discovery'],
  'T1083':     ['File and Directory Discovery', 'discovery'],
  'T1057':     ['Process Discovery', 'discovery'],
  'T1049':     ['System Network Connections Discovery', 'discovery'],
  'T1016':     ['System Network Configuration Discovery', 'discovery'],
  'T1033':     ['System Owner/User Discovery', 'discovery'],
  'T1087':     ['Account Discovery', 'discovery'],
  'T1069':     ['Permission Groups Discovery', 'discovery'],
  'T1135':     ['Network Share Discovery', 'discovery'],
  'T1046':     ['Network Service Discovery', 'discovery'],
  'T1518':     ['Software Discovery', 'discovery'],
  'T1021':     ['Remote Services', 'lateral_movement'],
  'T1021.001': ['Remote Desktop Protocol', 'lateral_movement'],
  'T1021.002': ['SMB/Windows Admin Shares', 'lateral_movement'],
  'T1021.006': ['Windows Remote Management', 'lateral_movement'],
  'T1570':     ['Lateral Tool Transfer', 'lateral_movement'],
  'T1550':     ['Use Alternate Authentication Material', 'lateral_movement'],
  'T1550.002': ['Pass the Hash', 'lateral_movement'],
  'T1005':     ['Data from Local System', 'collection'],
  'T1039':     ['Data from Network Shared Drive', 'collection'],
  'T1056':     ['Input Capture', 'collection'],
  'T1074':     ['Data Staged', 'collection'],
  'T1113':     ['Screen Capture', 'collection'],
  'T1071':     ['Application Layer Protocol', 'command_and_control'],
  'T1071.001': ['Web Protocols', 'command_and_control'],
  'T1071.004': ['DNS', 'command_and_control'],
  'T1095':     ['Non-Application Layer Protocol', 'command_and_control'],
  'T1105':     ['Ingress Tool Transfer', 'command_and_control'],
  'T1219':     ['Remote Access Software', 'command_and_control'],
  'T1041':     ['Exfiltration Over C2 Channel', 'exfiltration'],
  'T1048':     ['Exfiltration Over Alternative Protocol', 'exfiltration'],
  'T1567':     ['Exfiltration Over Web Service', 'exfiltration'],
  'T1486':     ['Data Encrypted for Impact', 'impact'],
  'T1490':     ['Inhibit System Recovery', 'impact'],
  'T1489':     ['Service Stop', 'impact'],
  'T1529':     ['System Shutdown/Reboot', 'impact'],
  'T1566':     ['Phishing', 'initial_access'],
  'T1566.001': ['Spearphishing Attachment', 'initial_access'],
  'T1566.002': ['Spearphishing Link', 'initial_access'],
  'T1190':     ['Exploit Public-Facing Application', 'initial_access'],
  'T1133':     ['External Remote Services', 'initial_access'],
  'T1078':     ['Valid Accounts', 'initial_access'],
  'T1195':     ['Supply Chain Compromise', 'initial_access'],
};

const TOTAL_TECHNIQUES = Object.keys(TECHNIQUE_MAP).length;

const TECHNIQUES_BY_TACTIC: Record<string, Array<{ id: string; name: string }>> = {};
for (const [id, [name, tactic]] of Object.entries(TECHNIQUE_MAP)) {
  if (!TECHNIQUES_BY_TACTIC[tactic]) TECHNIQUES_BY_TACTIC[tactic] = [];
  TECHNIQUES_BY_TACTIC[tactic].push({ id, name });
}

function cellStyle(count: number): React.CSSProperties {
  let bg: string;
  let color: string;
  if (count === 0)       { bg = '#EBF0F5'; color = '#98A2B3'; }
  else if (count === 1)  { bg = '#D4EDDA'; color = '#155724'; }
  else if (count <= 5)   { bg = '#54B399'; color = '#fff'; }
  else if (count <= 10)  { bg = '#017D73'; color = '#fff'; }
  else if (count <= 20)  { bg = '#005F5A'; color = '#fff'; }
  else                   { bg = '#003D3A'; color = '#fff'; }
  return {
    background: bg, color, fontSize: 10, lineHeight: '1.3',
    padding: '4px 6px', borderRadius: 3,
    marginBottom: 2, wordBreak: 'break-word', minHeight: 38,
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    transition: 'filter 0.1s',
  };
}

interface StatBoxProps { value: string | number; label: string; }
const StatBox: React.FC<StatBoxProps> = ({ value, label }) => (
  <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 140, textAlign: 'center' }}>
    <EuiText size="m" style={{ fontWeight: 700, fontSize: 28, lineHeight: '1.2' }}>{value}</EuiText>
    <EuiText size="xs" color="subdued">{label}</EuiText>
  </EuiPanel>
);

interface CoverageHeatmapProps {
  apiService: ApiService;
  embedded?: boolean;
}

export const CoverageHeatmap: React.FC<CoverageHeatmapProps> = ({ apiService, embedded }) => {
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);
  const [ruleYamls, setRuleYamls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleCount, setRuleCount] = useState(0);

  const handleExport = useCallback(async () => {
    if (!ruleYamls.length) return;
    setIsExporting(true);
    try {
      const layer = await apiService.navigatorExport(ruleYamls);
      const blob = new Blob([JSON.stringify(layer, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sigma-attack-navigator-layer.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    } finally {
      setIsExporting(false);
    }
  }, [apiService, ruleYamls]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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

      const yamls = docs.map((doc: any) => {
        const tags: string[] = Array.isArray(doc.tags) ? doc.tags : [];
        const title = String(doc.title ?? 'Unknown').replace(/"/g, '\\"');
        const tagsSection = tags.length > 0
          ? `tags:\n${tags.map((t: string) => `  - ${String(t)}`).join('\n')}`
          : '';
        return `title: "${title}"\nstatus: test\n${tagsSection}`;
      });

      const result = await apiService.computeCoverage(yamls);
      setRuleYamls(yamls);
      setCoverage(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Coverage computation failed');
    } finally {
      setIsLoading(false);
    }
  }, [apiService]);

  useEffect(() => { load(); }, [load]);

  const ruleCounts: Record<string, number> = {};
  const ruleNames: Record<string, string[]> = {};
  if (coverage) {
    for (const t of coverage.techniques) {
      ruleCounts[t.id] = t.rules.length;
      ruleNames[t.id] = t.rules;
    }
  }

  const coveredCount = coverage
    ? Object.keys(TECHNIQUE_MAP).filter(id => (ruleCounts[id] ?? 0) > 0).length
    : 0;

  // Derive tactic coverage from the rendered TECHNIQUE_MAP — avoids hyphen/underscore
  // mismatch between API tactic keys and the frontend TACTIC_ORDER keys.
  const coveredTacticSet = new Set(
    TACTIC_ORDER.filter(tactic =>
      (TECHNIQUES_BY_TACTIC[tactic] ?? []).some(({ id }) => (ruleCounts[id] ?? 0) > 0)
    )
  );
  const uncoveredTacticList = TACTIC_ORDER.filter(
    tactic => (TECHNIQUES_BY_TACTIC[tactic] ?? []).length > 0 && !coveredTacticSet.has(tactic)
  );
  const tacticsCovered = coveredTacticSet.size;
  const pct = TOTAL_TECHNIQUES > 0 ? Math.round((coveredCount / TOTAL_TECHNIQUES) * 100) : 0;

  return (
    <div style={{ padding: 16, ...(embedded ? {} : { overflowY: 'auto', height: 'calc(100vh - 96px)', marginTop: 48 }) }}>

      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m"><h2>ATT&amp;CK Coverage Heatmap</h2></EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Detection coverage across MITRE ATT&amp;CK from your rule library.</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="download"
                onClick={handleExport}
                isLoading={isExporting}
                isDisabled={!coverage}
                size="s"
              >
                Export Navigator Layer
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="refresh" onClick={load} isLoading={isLoading} size="s">
                Recompute
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading && (
        <EuiFlexGroup justifyContent="center" style={{ paddingTop: 80 }}>
          <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
            <EuiLoadingSpinner size="xl" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">Computing coverage from {ruleCount} rules…</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {error && !isLoading && (
        <EuiCallOut title={error} color="warning" iconType="warning" />
      )}

      {coverage && !isLoading && (
        <>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}><StatBox value={ruleCount} label="Rules in library" /></EuiFlexItem>
            <EuiFlexItem grow={false}><StatBox value={coveredCount} label="Techniques covered" /></EuiFlexItem>
            <EuiFlexItem grow={false}><StatBox value={`${pct}%`} label={`of ${TOTAL_TECHNIQUES} tracked`} /></EuiFlexItem>
            <EuiFlexItem grow={false}><StatBox value={`${tacticsCovered} / ${TACTIC_ORDER.length}`} label="Tactics covered" /></EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s" alignItems="center" style={{ maxWidth: 600 }}>
            <EuiFlexItem grow={false} style={{ minWidth: 80 }}>
              <EuiText size="xs" color="subdued">Coverage</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <div style={{ background: '#EBF0F5', borderRadius: 4, height: 8, width: '100%' }}>
                <div style={{ background: '#017D73', borderRadius: 4, height: 8, width: `${pct}%`, transition: 'width 0.4s' }} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 36 }}>
              <EuiText size="xs" color="subdued">{pct}%</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
            <EuiFlexItem grow={false}><EuiText size="xs" color="subdued">Legend:</EuiText></EuiFlexItem>
            {[
              { bg: '#EBF0F5', label: 'No coverage' },
              { bg: '#D4EDDA', label: '1 rule' },
              { bg: '#54B399', label: '2–5 rules' },
              { bg: '#017D73', label: '6–10 rules' },
              { bg: '#005F5A', label: '11–20 rules' },
              { bg: '#003D3A', label: '20+ rules' },
            ].map(({ bg, label }) => (
              <EuiFlexItem key={label} grow={false}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, background: bg, borderRadius: 2, display: 'inline-block', border: '1px solid #D3DAE6' }} />
                  <EuiText size="xs">{label}</EuiText>
                </span>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {uncoveredTacticList.length > 0 && (
            <EuiCallOut
              title={`${uncoveredTacticList.length} tactic${uncoveredTacticList.length > 1 ? 's' : ''} with no coverage`}
              color="warning"
              iconType="alert"
              size="s"
            >
              <EuiFlexGroup gutterSize="xs" wrap>
                {uncoveredTacticList.map(t => (
                  <EuiFlexItem key={t} grow={false}>
                    <EuiBadge color="warning">{TACTIC_LABELS[t] ?? t}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiCallOut>
          )}

          <EuiSpacer size="m" />

          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, minWidth: `${TACTIC_ORDER.length * 158}px` }}>
              {TACTIC_ORDER.map(tactic => {
                const techniques = TECHNIQUES_BY_TACTIC[tactic] ?? [];
                const covered = coveredTacticSet.has(tactic);
                return (
                  <div key={tactic} style={{ flex: '0 0 152px', width: 152 }}>
                    <div style={{
                      background: covered ? '#006BB4' : '#69707D',
                      color: '#fff',
                      padding: '6px 8px',
                      borderRadius: '4px 4px 0 0',
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 4,
                      minHeight: 42,
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      {TACTIC_LABELS[tactic] ?? tactic}
                    </div>

                    {techniques.map(({ id, name }) => {
                      const count = ruleCounts[id] ?? 0;
                      const rules = ruleNames[id] ?? [];
                      const tooltip = count > 0
                        ? `${count} rule${count > 1 ? 's' : ''}: ${rules.slice(0, 4).join(', ')}${rules.length > 4 ? ` +${rules.length - 4} more` : ''}`
                        : 'No rules detect this technique';
                      return (
                        <div key={id} style={cellStyle(count)} title={tooltip}>
                          <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: '0.02em' }}>{id}</span>
                          <span style={{ fontSize: 9, opacity: 0.9, marginTop: 1 }}>{name}</span>
                          {count > 0 && (
                            <span style={{ fontSize: 9, marginTop: 2, fontStyle: 'italic', opacity: 0.75 }}>
                              {count} rule{count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
