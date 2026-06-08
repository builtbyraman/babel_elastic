import React from 'react';
import { ApiService } from '../services/api';
interface RuleSelectorProps {
    onClose: () => void;
    onSelect: (yamlContent: string) => void;
    apiService: ApiService;
}
export declare const RuleSelector: React.FC<RuleSelectorProps>;
export {};
