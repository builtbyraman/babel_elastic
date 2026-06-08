import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
export declare class BabelPublicPlugin implements Plugin<void, void> {
    private services;
    setup(core: CoreSetup): void;
    start(core: CoreStart): void;
    stop(): void;
}
