import React from 'react';
export interface HttpService {
    get<T = unknown>(path: string, options?: {
        query?: Record<string, unknown>;
    }): Promise<T>;
    post<T = unknown>(path: string, options?: {
        body?: string;
    }): Promise<T>;
}
export interface KibanaServices {
    http: HttpService;
}
export declare const KibanaProvider: React.FC<{
    services: KibanaServices;
    children: React.ReactNode;
}>;
export declare function useKibana(): KibanaServices;
