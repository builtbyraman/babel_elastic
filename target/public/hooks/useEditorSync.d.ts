import { SigmaRule } from '../types';
interface SyncState {
    yaml: string;
    rule: SigmaRule | null;
    parseError: string | null;
}
interface SyncActions {
    setYaml: (value: string) => void;
    updateRule: (patch: Partial<SigmaRule>) => void;
}
export declare function useEditorSync(initialYaml: string): [SyncState, SyncActions];
export {};
