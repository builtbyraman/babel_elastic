import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppMountParameters } from '@kbn/core/public';
import { KibanaProvider, KibanaServices } from './context/KibanaContext';
import { App } from './components/App';

export function renderApp(
  { element }: AppMountParameters,
  services: KibanaServices
): () => void {
  const root = createRoot(element);
  root.render(
    <KibanaProvider services={services}>
      <App />
    </KibanaProvider>
  );
  return () => root.unmount();
}