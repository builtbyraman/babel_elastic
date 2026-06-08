import React from 'react';
interface TopNavProps {
    onNewRule: () => void;
    onSelectRule: () => void;
    onSyncRules: () => void;
    onOpenSettings: () => void;
    onOpenCoverage: () => void;
    isSyncing: boolean;
    coverageActive: boolean;
}
export declare const TopNav: React.FC<TopNavProps>;
export {};
