import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { ApiService, DataSource } from '../services/api';

const PRODUCT_ICONS: Record<string, string> = {
  windows:          '🪟',
  linux:            '🐧',
  endpoint:         '🛡',
  network:          '🌐',
  aws:              '☁️',
  gcp:              '☁️',
  azure:            '☁️',
  office365:        '📧',
  okta:             '🔐',
  google_workspace: '📁',
  github:           '🐙',
};

const SIGMA_CATEGORIES: Record<string, string[]> = {
  windows:          ['process_creation', 'network_connection', 'dns_query', 'file_event', 'registry_add', 'registry_set', 'image_load'],
  linux:            ['process_creation', 'network_connection', 'file_event', 'user_change'],
  endpoint:         ['process_creation', 'network_connection', 'file_event', 'registry_add'],
  network:          ['network_connection', 'dns_query', 'proxy', 'firewall'],
  aws:              ['cloud_trail', 'aws_cloudtrail'],
  gcp:              ['gcp_audit'],
  azure:            ['azure_activity'],
  office365:        ['office365_exchange', 'office365_sharepoint'],
  okta:             ['okta'],
  google_workspace: ['google_workspace'],
  github:           ['github'],
};

interface DataSourcePanelProps {
  apiService: ApiService;
}

export const DataSourcePanel: React.FC<DataSourcePanelProps> = ({ apiService }) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.getDataSources();
      setSources((res as any)?.sources ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data sources');
    } finally {
      setIsLoading(false);
    }
  }, [apiService]);

  useEffect(() => { load(); }, [load]);

  const available = sources.filter(s => s.available);
  const missing = sources.filter(s => !s.available);

  return (
    <div style={{ padding: 16 }}>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m"><h2>Data Source Awareness</h2></EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Elasticsearch indices mapped to SIGMA logsource categories. Rules for uncovered sources won't produce alerts.</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="refresh" onClick={load} isLoading={isLoading} size="s">
            Refresh
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading && (
        <EuiFlexGroup justifyContent="center" style={{ paddingTop: 60 }}>
          <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
            <EuiLoadingSpinner size="xl" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">Introspecting Elasticsearch indices…</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {error && !isLoading && (
        <EuiCallOut title={error} color="warning" iconType="warning" />
      )}

      {!isLoading && sources.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="m" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 130, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{available.length}</EuiText>
                <EuiText size="xs" color="subdued">Sources with data</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 130, textAlign: 'center' }}>
                <EuiText style={{ fontWeight: 700, fontSize: 26 }}>{missing.length}</EuiText>
                <EuiText size="xs" color="subdued">No coverage</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          {missing.length > 0 && (
            <>
              <EuiCallOut
                title={`${missing.length} logsource product${missing.length > 1 ? 's' : ''} have no data in this cluster`}
                color="warning"
                iconType="alert"
                size="s"
              >
                <p>SIGMA rules targeting these products will not produce alerts without ingesting the relevant log data.</p>
                <EuiFlexGroup gutterSize="xs" wrap style={{ marginTop: 8 }}>
                  {missing.map(s => (
                    <EuiFlexItem key={s.product} grow={false}>
                      <EuiBadge color="hollow">{PRODUCT_ICONS[s.product] ?? '•'} {s.label}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

          <EuiTitle size="xs"><h3>Logsource Products</h3></EuiTitle>
          <EuiSpacer size="s" />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {sources.map(source => {
              const categories = SIGMA_CATEGORIES[source.product] ?? [];
              const borderColor = source.available ? '#017D73' : '#D3DAE6';
              const headerBg = source.available ? '#017D73' : '#6a717d';

              return (
                <EuiPanel
                  key={source.product}
                  hasBorder
                  paddingSize="none"
                  style={{ width: 210, borderTop: `3px solid ${borderColor}`, overflow: 'hidden' }}
                >
                  <div style={{ background: headerBg, padding: '8px 12px', color: '#fff' }}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <span style={{ fontSize: 18 }}>{PRODUCT_ICONS[source.product] ?? '•'}</span>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{source.label}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={source.available ? 'success' : 'default'} style={{ fontSize: 10 }}>
                          {source.available ? 'Active' : 'No data'}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>

                  <div style={{ padding: '10px 12px' }}>
                    {source.available ? (
                      <>
                        <EuiText size="xs" color="subdued">
                          {source.index_count} index{source.index_count !== 1 ? 'es' : ''} · {source.doc_count.toLocaleString()} docs
                        </EuiText>
                        {source.indices.slice(0, 3).map(idx => (
                          <EuiText key={idx} size="xs" style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>
                            {idx}
                          </EuiText>
                        ))}
                        {source.index_count > 3 && (
                          <EuiText size="xs" color="subdued">+{source.index_count - 3} more</EuiText>
                        )}
                        <EuiSpacer size="xs" />
                      </>
                    ) : (
                      <EuiText size="xs" color="subdued" style={{ marginBottom: 6 }}>No matching indices found</EuiText>
                    )}

                    <EuiText size="xs" color="subdued" style={{ marginBottom: 4, fontWeight: 600 }}>
                      SIGMA categories
                    </EuiText>
                    <EuiFlexGroup gutterSize="xs" wrap>
                      {categories.map(cat => (
                        <EuiFlexItem key={cat} grow={false}>
                          <EuiToolTip content={source.available ? 'Category available' : 'No data source for this category'}>
                            <EuiBadge color={source.available ? 'hollow' : 'default'} style={{ fontSize: 9 }}>
                              {cat}
                            </EuiBadge>
                          </EuiToolTip>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </div>
                </EuiPanel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
