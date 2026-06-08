import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { KibanaProvider, HttpService } from './context/KibanaContext';

const standaloneHttp: HttpService = {
  get: async <T,>(url: string, options?: { query?: Record<string, unknown> }): Promise<T> => {
    const params = new URLSearchParams(
      Object.entries(options?.query ?? {})
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    );
    const fullUrl = params.toString() ? `${url}?${params}` : url;
    const res = await fetch(fullUrl, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async <T,>(url: string, options?: { body?: string }): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'kbn-xsrf': 'true' },
      body: options?.body,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

const container = document.getElementById('root')!;
createRoot(container).render(
  <KibanaProvider services={{ http: standaloneHttp }}>
    <App />
  </KibanaProvider>
);
