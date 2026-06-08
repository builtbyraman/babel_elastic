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
      if (cfg && typeof (cfg as any).pipe === 'function') {
        (cfg as any).pipe((v: any) => v).subscribe?.((v: PluginConfig) => {
          sigmaApiUrl = v.sigmaApiUrl || sigmaApiUrl;
          kibanaUrl = v.kibanaUrl || kibanaUrl;
        });
      } else if ((cfg as any)?.sigmaApiUrl) {
        sigmaApiUrl = (cfg as any).sigmaApiUrl;
        kibanaUrl = (cfg as any).kibanaUrl || kibanaUrl;
      }
    } catch { /* use default */ }
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
