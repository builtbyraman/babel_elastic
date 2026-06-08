import { PluginInitializer } from '@kbn/core/public';
import { BabelPublicPlugin } from './plugin';

export const plugin: PluginInitializer<void, void> = () => {
  return new BabelPublicPlugin();
};
