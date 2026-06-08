import React from 'react';
import { ApiService } from '../services/api';
interface YamlEditorProps {
    value: string;
    onChange: (value: string) => void;
    parseError: string | null;
    apiService?: ApiService;
}
export declare const YamlEditor: React.FC<YamlEditorProps>;
export {};
