import { AppMountParameters } from '@kbn/core/public';
import { KibanaServices } from './context/KibanaContext';
export declare function renderApp({ element }: AppMountParameters, services: KibanaServices): () => void;
