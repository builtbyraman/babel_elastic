"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BabelPlugin = void 0;
const routes_1 = require("./routes");
class BabelPlugin {
    constructor(initializerContext) {
        this.logger = initializerContext.logger.get();
        this.initializerContext = initializerContext;
    }
    setup(core) {
        var _a, _b;
        this.logger.debug('babel: setup');
        const router = core.http.createRouter();
        let sigmaApiUrl = 'http://localhost:8001/v1';
        let kibanaUrl = 'http://localhost:5601';
        try {
            const cfg = this.initializerContext.config.create();
            if (cfg && typeof cfg.pipe === 'function') {
                (_b = (_a = cfg.pipe((v) => v)).subscribe) === null || _b === void 0 ? void 0 : _b.call(_a, (v) => {
                    sigmaApiUrl = v.sigmaApiUrl || sigmaApiUrl;
                    kibanaUrl = v.kibanaUrl || kibanaUrl;
                });
            }
            else if (cfg === null || cfg === void 0 ? void 0 : cfg.sigmaApiUrl) {
                sigmaApiUrl = cfg.sigmaApiUrl;
                kibanaUrl = cfg.kibanaUrl || kibanaUrl;
            }
        }
        catch { /* use default */ }
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