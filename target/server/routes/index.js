"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const sigma_doc_1 = require("./sigma_doc");
const sigma_translation_1 = require("./sigma_translation");
const sigma_watcher_1 = require("./sigma_watcher");
const github_key_1 = require("./github_key");
const github_sync_1 = require("./github_sync");
const static_app_1 = require("./static_app");
const sigma_repos_1 = require("./sigma_repos");
const sigma_validate_1 = require("./sigma_validate");
const sigma_test_run_1 = require("./sigma_test_run");
const sigma_deploy_1 = require("./sigma_deploy");
const sigma_fields_1 = require("./sigma_fields");
const sigma_coverage_1 = require("./sigma_coverage");
const sigma_data_sources_1 = require("./sigma_data_sources");
const sigma_ir_readiness_1 = require("./sigma_ir_readiness");
const sigma_effectiveness_1 = require("./sigma_effectiveness");
const status_1 = require("./status");
function registerRoutes(router, _core, config) {
    (0, sigma_doc_1.registerSigmaDocRoute)(router);
    (0, sigma_translation_1.registerSigmaTranslationRoute)(router, config);
    (0, sigma_watcher_1.registerSigmaWatcherRoute)(router);
    (0, github_key_1.registerGithubKeyRoutes)(router);
    (0, github_sync_1.registerGithubSyncRoute)(router);
    (0, static_app_1.registerStaticAppRoute)(router);
    (0, sigma_repos_1.registerSigmaReposRoutes)(router);
    (0, sigma_validate_1.registerSigmaValidateRoute)(router, config);
    (0, sigma_test_run_1.registerSigmaTestRunRoute)(router, config);
    (0, sigma_deploy_1.registerSigmaDeployRoute)(router, config);
    (0, sigma_fields_1.registerSigmaFieldsRoutes)(router, config);
    (0, sigma_coverage_1.registerSigmaCoverageRoute)(router, config);
    (0, sigma_data_sources_1.registerSigmaDataSourcesRoute)(router);
    (0, sigma_ir_readiness_1.registerSigmaIrReadinessRoutes)(router, config);
    (0, sigma_effectiveness_1.registerSigmaEffectivenessRoutes)(router, config);
    (0, status_1.registerStatusRoute)(router, config);
}
//# sourceMappingURL=index.js.map