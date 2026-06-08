import React, { createContext, useContext } from 'react';

export interface HttpService {
  get<T = unknown>(path: string, options?: { query?: Record<string, unknown> }): Promise<T>;
  post<T = unknown>(path: string, options?: { body?: string }): Promise<T>;
}

export interface KibanaServices {
  http: HttpService;
}

const KibanaContext = createContext<KibanaServices | null>(null);

export const KibanaProvider: React.FC<{ services: KibanaServices; children: React.ReactNode }> = ({
  services,
  children,
}) => <KibanaContext.Provider value={services}>{children}</KibanaContext.Provider>;

export function useKibana(): KibanaServices {
  const ctx = useContext(KibanaContext);
  if (!ctx) throw new Error('useKibana must be used within KibanaProvider');
  return ctx;
}