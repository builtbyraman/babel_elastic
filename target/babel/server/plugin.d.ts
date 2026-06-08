import { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import { BabelPluginSetup, BabelPluginStart } from './types';
export declare class BabelPlugin implements Plugin<BabelPluginSetup, BabelPluginStart> {
    private readonly logger;
    private readonly initializerContext;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): BabelPluginSetup;
    start(core: CoreStart): BabelPluginStart;
    stop(): void;
}
