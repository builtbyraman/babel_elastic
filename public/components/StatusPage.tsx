import React, { useEffect, useState, useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ApiService } from '../services/api';
import type { SigmaRepo } from '../services/api';

function StatusBadge({ status }: { status: string }) {
  const color = status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : 'danger';
  return <EuiBadge color={color}>{status}</EuiBadge>;
}

function ServiceCard({ name, status, latency, info }: {
  name: string; status: string; latency?: number | null; info?: any;
}) {
  return (
    <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 220 }}>
      <EuiText size="s" style={{ fontWeight: 700, marginBottom: 6 }}>{name}</EuiText>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}><StatusBadge status={status} /></EuiFlexItem>
        {latency != null && (
          <EuiFlexItem grow={false}><EuiText size="xs" color="subdued">{latency}ms</EuiText></EuiFlexItem>
        )}
      </EuiFlexGroup>
      {info?.version && (
        <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
          v{info.version.number ?? info.version}
        </EuiText>
      )}
    </EuiPanel>
  );
}

export const StatusPage: React.FC<{ apiService: ApiService }> = ({ apiService }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<any[] | null>(null);
  const [repos, setRepos] = useState<SigmaRepo[] | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, dsRes, reposRes] = await Promise.allSettled([
        apiService.getStatus(),
        apiService.getDataSources(),
        apiService.getRepos(),
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      else setError((statusRes.reason as Error)?.message || 'Failed to load status');
      if (dsRes.status === 'fulfilled') setDataSources((dsRes.value as any)?.sources ?? null);
      if (reposRes.status === 'fulfilled') setRepos((reposRes.value as any)?.data?.repos ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  if (loading) return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}><EuiLoadingSpinner /></EuiFlexItem>
    </EuiFlexGroup>
  );

  const services: any[] = status?.services ?? [];
  const availableSources = (dataSources ?? []).filter((s: any) => s.available);
  const missingSources = (dataSources ?? []).filter((s: any) => !s.available);

  return (
    <div>
      <EuiTitle size="s"><h4>Integration & Status</h4></EuiTitle>
      <EuiSpacer size="m" />

      {services.length > 0 && (
        <>
          <EuiTitle size="xxs"><h5>Services</h5></EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" wrap>
            {services.map((s: any) => (
              <EuiFlexItem key={s.name} grow={false}>
                <ServiceCard name={s.name} status={s.status} latency={s.latency_ms} info={s.info} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
        </>
      )}

      {error && (
        <>
          <EuiCallOut title={error} color="warning" iconType="warning" size="s" />
          <EuiSpacer size="s" />
        </>
      )}

      {dataSources !== null && (
        <>
          <EuiTitle size="xxs"><h5>Data Sources</h5></EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="s" style={{ minWidth: 110, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 20 }}>{availableSources.length}</EuiText>
                <EuiText size="xs" color="subdued">Active</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="s" style={{ minWidth: 110, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 20 }}>{missingSources.length}</EuiText>
                <EuiText size="xs" color="subdued">No data</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap>
            {dataSources.map((s: any) => (
              <EuiFlexItem key={s.product} grow={false}>
                <EuiBadge color={s.available ? 'success' : 'default'}>{s.label}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {repos !== null && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiTitle size="xxs"><h5>Configured Repositories</h5></EuiTitle>
          <EuiSpacer size="s" />
          {repos.length === 0 ? (
            <EuiText size="s" color="subdued">No repositories configured. Add one in Settings.</EuiText>
          ) : (
            <EuiFlexGroup gutterSize="s" wrap>
              {repos.map((repo) => (
                <EuiFlexItem key={repo.id} grow={false}>
                  <EuiPanel hasBorder paddingSize="s" style={{ minWidth: 220 }}>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem>
                        <EuiText size="s" style={{ fontWeight: 700 }}>{repo.name}</EuiText>
                        <EuiText size="xs" color="subdued">{repo.url}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={repo.enabled ? 'success' : 'default'}>
                          {repo.enabled ? 'enabled' : 'disabled'}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}

      <EuiSpacer size="m" />
      <EuiButton onClick={fetchStatus} iconType="refresh" size="s">Refresh Status</EuiButton>
    </div>
  );
};
