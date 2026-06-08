import { PluginInitializer } from '@kbn/core/server';
import { BabelPluginSetup, BabelPluginStart } from './types';
export declare const config: {
    schema: import("@kbn/config-schema").Type<{
        sigmaApiUrl: string;
        kibanaUrl: string;
    }>;
};
export declare const plugin: PluginInitializer<BabelPluginSetup, BabelPluginStart>;
export type { BabelPluginSetup, BabelPluginStart };
