import { Plugin, CoreSetup, CoreStart, Logger, PluginInitializerContext } from '@kbn/core/server';
import { BabelPluginSetup, BabelPluginStart } from './types';
import { registerRoutes } from './routes';
import { PluginConfig } from './config';

export class BabelPlugin implements Plugin<BabelPluginSetup, BabelPluginStart> {
  private readonly logger: Logger;
  private readonly initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup): BabelPluginSetup {
    this.logger.debug('babel: setup');
    const router = core.http.createRouter();
    let sigmaApiUrl = 'http://localhost:8001/v1';
    let kibanaUrl = 'http://localhost:5601';
    try {
      const cfg = this.initializerContext.config.create<PluginConfig>();
      if (cfg && typeof (cfg as any).subscribe === 'function') {
        (cfg as any).subscribe((v: PluginConfig) => {
          if (v.sigmaApiUrl) sigmaApiUrl = v.sigmaApiUrl;
          if (v.kibanaUrl) kibanaUrl = v.kibanaUrl;
        });
      } else if ((cfg as any)?.sigmaApiUrl) {
        sigmaApiUrl = (cfg as any).sigmaApiUrl;
        kibanaUrl = (cfg as any).kibanaUrl || kibanaUrl;
      }
    } catch { /* use default */ }
    // Kibana doesn't forward dotted env var names to the plugin config service, so the
    // Observable above will emit the schema default when babel.sigmaApiUrl isn't in
    // kibana.yml. Env vars win over schema defaults as the explicit operator override.
    const envSigmaApiUrl = process.env.SIGMA_API_URL || process.env['babel.sigmaApiUrl'];
    if (envSigmaApiUrl) sigmaApiUrl = envSigmaApiUrl;
    const envKibanaUrl = process.env['babel.kibanaUrl'];
    if (envKibanaUrl) kibanaUrl = envKibanaUrl;
    const pluginConfig: PluginConfig = { sigmaApiUrl, kibanaUrl };
    registerRoutes(router, core, pluginConfig);
    return {};
  }

  public start(core: CoreStart): BabelPluginStart {
    this.logger.debug('babel: start');
    const client = core.elasticsearch.client.asInternalUser as any;
    client.indices.exists({ index: 'babel_config' })
      .then((exists: boolean) => {
        if (!exists) return client.indices.create({ index: 'babel_config' });
      })
      .catch((err: unknown) => {
        this.logger.warn(`babel: could not bootstrap babel_config index: ${err}`);
      });
    return {};
  }

  public stop() {
    this.logger.debug('babel: stop');
  }
}
