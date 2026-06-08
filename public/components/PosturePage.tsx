import React, { useState } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { ApiService } from '../services/api';
import { CoverageHeatmap } from './CoverageHeatmap';
import { IrReadinessPanel } from './IrReadinessPanel';
import { DataSourcePanel } from './DataSourcePanel';

type TabId = 'heatmap' | 'ir_readiness' | 'data_sources';

interface PosturePageProps {
  apiService: ApiService;
}

export const PosturePage: React.FC<PosturePageProps> = ({ apiService }) => {
  const [activeTab, setActiveTab] = useState<TabId>('heatmap');

  return (
    <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div style={{ borderBottom: '1px solid #D3DAE6', paddingLeft: 16, paddingTop: 8, flexShrink: 0 }}>
        <EuiTabs>
          <EuiTab isSelected={activeTab === 'heatmap'} onClick={() => setActiveTab('heatmap')}>
            ATT&CK Heatmap
          </EuiTab>
          <EuiTab isSelected={activeTab === 'ir_readiness'} onClick={() => setActiveTab('ir_readiness')}>
            IR Readiness
          </EuiTab>
          <EuiTab isSelected={activeTab === 'data_sources'} onClick={() => setActiveTab('data_sources')}>
            Data Sources
          </EuiTab>
        </EuiTabs>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'heatmap' && <CoverageHeatmap apiService={apiService} embedded />}
        {activeTab === 'ir_readiness' && <IrReadinessPanel apiService={apiService} />}
        {activeTab === 'data_sources' && <DataSourcePanel apiService={apiService} />}
      </div>
    </div>
  );
};
