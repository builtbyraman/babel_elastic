import React from 'react';
import { SigmaRule } from '../types';
interface VisualEditorProps {
    rule: SigmaRule | null;
    onChange: (patch: Partial<SigmaRule>) => void;
}
export declare const VisualEditor: React.FC<VisualEditorProps>;
export {};
