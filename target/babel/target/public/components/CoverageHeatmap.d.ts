import React from 'react';
import { ApiService } from '../services/api';
interface CoverageHeatmapProps {
    apiService: ApiService;
    embedded?: boolean;
}
export declare const CoverageHeatmap: React.FC<CoverageHeatmapProps>;
export {};
