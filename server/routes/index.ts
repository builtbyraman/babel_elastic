import { IRouter, CoreSetup } from '@kbn/core/server';
import { PluginConfig } from '../config';
import { registerSigmaDocRoute } from './sigma_doc';
import { registerSigmaTranslationRoute } from './sigma_translation';
import { registerSigmaWatcherRoute } from './sigma_watcher';
import { registerTdmKeyRoutes } from './tdm_key';
import { registerTdmUpdateRoute } from './tdm_update';
import { registerStaticAppRoute } from './static_app';
import { registerSigmaReposRoutes } from './sigma_repos';
import { registerSigmaValidateRoute } from './sigma_validate';
import { registerSigmaTestRunRoute } from './sigma_test_run';
import { registerSigmaDeployRoute } from './sigma_deploy';
import { registerSigmaFieldsRoutes } from './sigma_fields';
import { registerSigmaCoverageRoute } from './sigma_coverage';
import { registerSigmaDataSourcesRoute } from './sigma_data_sources';
import { registerSigmaIrReadinessRoutes } from './sigma_ir_readiness';
import { registerSigmaEffectivenessRoutes } from './sigma_effectiveness';
import { registerStatusRoute } from './status';

export function registerRoutes(router: IRouter, _core: CoreSetup, config: PluginConfig): void {
  registerSigmaDocRoute(router);
  registerSigmaTranslationRoute(router, config);
  registerSigmaWatcherRoute(router);
  registerTdmKeyRoutes(router);
  registerTdmUpdateRoute(router);
  registerStaticAppRoute(router);
  registerSigmaReposRoutes(router);
  registerSigmaValidateRoute(router, config);
  registerSigmaTestRunRoute(router, config);
  registerSigmaDeployRoute(router, config);
  registerSigmaFieldsRoutes(router, config);
  registerSigmaCoverageRoute(router, config);
  registerSigmaDataSourcesRoute(router);
  registerSigmaIrReadinessRoutes(router, config);
  registerSigmaEffectivenessRoutes(router, config);
  registerStatusRoute(router, config);
}
