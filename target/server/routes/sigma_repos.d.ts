import { IRouter } from '@kbn/core/server';
export interface SigmaRepo {
    id: string;
    name: string;
    url: string;
    branch: string;
    rulesPath: string;
    enabled: boolean;
}
export declare function registerSigmaReposRoutes(router: IRouter): void;
