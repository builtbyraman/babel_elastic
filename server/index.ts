import { PluginInitializer } from '@kbn/core/server';
import { BabelPlugin } from './plugin';
import { BabelPluginSetup, BabelPluginStart } from './types';
import { configSchema } from './config';

export const config = { schema: configSchema };

export const plugin: PluginInitializer<BabelPluginSetup, BabelPluginStart> = (context) => {
  return new BabelPlugin(context);
};

export type { BabelPluginSetup, BabelPluginStart };
