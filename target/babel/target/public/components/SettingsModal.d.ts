import React from 'react';
import { ApiService } from '../services/api';
interface SettingsModalProps {
    onClose: () => void;
    apiService: ApiService;
}
export declare const SettingsModal: React.FC<SettingsModalProps>;
export {};
