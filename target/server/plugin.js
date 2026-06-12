"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BabelPlugin = void 0;
const routes_1 = require("./routes");
class BabelPlugin {
    logger;
    initializerContext;
    constructor(initializerContext) {
        this.logger = initializerContext.logger.get();
        this.initializerContext = initializerContext;
    }
    setup(core) {
        this.logger.debug('babel: setup');
        const router = core.http.createRouter();
        let sigmaApiUrl = 'http://localhost:8001/v1';
        let kibanaUrl = 'http://localhost:5601';
        try {
            const cfg = this.initializerContext.config.create();
            if (cfg && typeof cfg.subscribe === 'function') {
                cfg.subscribe((v) => {
                    if (v.sigmaApiUrl)
                        sigmaApiUrl = v.sigmaApiUrl;
                    if (v.kibanaUrl)
                        kibanaUrl = v.kibanaUrl;
                });
            }
            else if (cfg?.sigmaApiUrl) {
                sigmaApiUrl = cfg.sigmaApiUrl;
                kibanaUrl = cfg.kibanaUrl || kibanaUrl;
            }
        }
        catch { /* use default */ }
        // Kibana doesn't forward dotted env var names to the plugin config service, so the
        // Observable above will emit the schema default when babel.sigmaApiUrl isn't in
        // kibana.yml. Env vars win over schema defaults as the explicit operator override.
        const envSigmaApiUrl = process.env.SIGMA_API_URL || process.env['babel.sigmaApiUrl'];
        if (envSigmaApiUrl)
            sigmaApiUrl = envSigmaApiUrl;
        const envKibanaUrl = process.env['babel.kibanaUrl'];
        if (envKibanaUrl)
            kibanaUrl = envKibanaUrl;
        const pluginConfig = { sigmaApiUrl, kibanaUrl };
        (0, routes_1.registerRoutes)(router, core, pluginConfig);
        return {};
    }
    start(core) {
        this.logger.debug('babel: start');
        const client = core.elasticsearch.client.asInternalUser;
        client.indices.exists({ index: 'babel_config' })
            .then((exists) => {
            if (!exists)
                return client.indices.create({ index: 'babel_config' });
        })
            .catch((err) => {
            this.logger.warn(`babel: could not bootstrap babel_config index: ${err}`);
        });
        return {};
    }
    stop() {
        this.logger.debug('babel: stop');
    }
}
exports.BabelPlugin = BabelPlugin;
//# sourceMappingURL=plugin.js.map