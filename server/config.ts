import { schema } from '@kbn/config-schema';

export const configSchema = schema.object({
  sigmaApiUrl: schema.string({ defaultValue: 'http://localhost:8001/v1' }),
  kibanaUrl: schema.string({ defaultValue: 'http://localhost:5601' }),
});

export type PluginConfig = {
  sigmaApiUrl: string;
  kibanaUrl: string;
};
