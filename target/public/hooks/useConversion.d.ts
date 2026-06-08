import { SigmaRule } from '../types';
import { ApiService } from '../services/api';
export declare function getAutoPipeline(logsource?: Record<string, string>): string;
export interface ConversionState {
    result: string | null;
    error: string | null;
    isConverting: boolean;
    pipeline: string;
}
export declare function useConversion(yaml: string, rule: SigmaRule | null, format: string, apiService: ApiService): ConversionState;
