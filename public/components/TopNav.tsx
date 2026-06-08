import React from 'react';
import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderLinks,
  EuiHeaderLink,
  EuiButton,
  EuiButtonIcon,
} from '@elastic/eui';

interface TopNavProps {
  onNewRule: () => void;
  onSelectRule: () => void;
  onSyncRules: () => void;
  onOpenSettings: () => void;
  onOpenCoverage: () => void;
  isSyncing: boolean;
  coverageActive: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  onNewRule,
  onSelectRule,
  onSyncRules,
  onOpenSettings,
  onOpenCoverage,
  isSyncing,
  coverageActive,
}) => (
  <EuiHeader position="fixed">
    <EuiHeaderSection grow={false}>
      <EuiHeaderSectionItem>
        <EuiHeaderLogo iconType="globe" onClick={onNewRule} style={{ cursor: 'pointer' }}>Babel</EuiHeaderLogo>
      </EuiHeaderSectionItem>
      <EuiHeaderSectionItem>
        <EuiButtonIcon
          aria-label="Settings"
          iconType="gear"
          size="s"
          color="text"
          onClick={onOpenSettings}
        />
      </EuiHeaderSectionItem>
    </EuiHeaderSection>

    <EuiHeaderSection side="right">
      <EuiHeaderSectionItem>
        <EuiHeaderLinks gutterSize="s">
          <EuiHeaderLink iconType="search" onClick={onSelectRule}>
            Select Rule
          </EuiHeaderLink>
          <EuiHeaderLink
            iconType="heatmap"
            onClick={onOpenCoverage}
            isActive={coverageActive}
          >
            Coverage
          </EuiHeaderLink>
          <EuiHeaderLink
            iconType="refresh"
            onClick={onSyncRules}
            isDisabled={isSyncing}
          >
            {isSyncing ? 'Syncing…' : 'Sync Rules'}
          </EuiHeaderLink>
          <EuiButton
            size="s"
            fill
            iconType="plusInCircle"
            onClick={onNewRule}
            style={{ marginLeft: 4 }}
          >
            New Rule
          </EuiButton>
        </EuiHeaderLinks>
      </EuiHeaderSectionItem>
    </EuiHeaderSection>
  </EuiHeader>
);
