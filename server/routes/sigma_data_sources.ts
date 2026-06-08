import { IRouter } from '@kbn/core/server';

const INDEX_PRODUCT_MAP: Array<{ pattern: RegExp; product: string; label: string; category: string }> = [
  { pattern: /^winlogbeat-/,              product: 'windows',         label: 'Windows',         category: 'Windows Event Logs (Winlogbeat)' },
  { pattern: /^logs-windows\./,           product: 'windows',         label: 'Windows',         category: 'Windows (Elastic Agent)' },
  { pattern: /^logs-endpoint\.events\./,  product: 'endpoint',        label: 'Endpoint',        category: 'Elastic Endpoint Events' },
  { pattern: /^auditbeat-/,              product: 'linux',            label: 'Linux',           category: 'Linux Audit (Auditbeat)' },
  { pattern: /^logs-linux\./,             product: 'linux',            label: 'Linux',           category: 'Linux (Elastic Agent)' },
  { pattern: /^filebeat-/,               product: 'linux',            label: 'Linux',           category: 'File Logs (Filebeat)' },
  { pattern: /^logs-system\./,            product: 'linux',            label: 'Linux',           category: 'System Logs (Elastic Agent)' },
  { pattern: /^packetbeat-/,             product: 'network',          label: 'Network',         category: 'Network Traffic (Packetbeat)' },
  { pattern: /^logs-network_traffic\./,   product: 'network',          label: 'Network',         category: 'Network Traffic (Elastic Agent)' },
  { pattern: /^logs-aws\./,              product: 'aws',              label: 'AWS',             category: 'AWS CloudTrail / CloudWatch' },
  { pattern: /^logs-gcp\./,              product: 'gcp',              label: 'GCP',             category: 'GCP Logs' },
  { pattern: /^logs-azure\./,            product: 'azure',            label: 'Azure',           category: 'Azure Monitor Logs' },
  { pattern: /^logs-o365\./,             product: 'office365',        label: 'Office 365',      category: 'Microsoft 365 Audit Logs' },
  { pattern: /^logs-okta\./,             product: 'okta',             label: 'Okta',            category: 'Okta System Log' },
  { pattern: /^logs-google_workspace\./,  product: 'google_workspace', label: 'Google Workspace', category: 'Google Workspace Logs' },
  { pattern: /^logs-github\./,           product: 'github',           label: 'GitHub',          category: 'GitHub Audit Logs' },
  { pattern: /^\.alerts-/,              product: '_alerts',           label: 'Security Alerts', category: 'Elastic Security Alerts' },
  { pattern: /^\.siem-signals-/,        product: '_alerts',           label: 'Security Alerts', category: 'SIEM Detection Alerts' },
];

const KNOWN_PRODUCTS = [
  'windows', 'linux', 'endpoint', 'network',
  'aws', 'gcp', 'azure', 'office365', 'okta', 'google_workspace', 'github',
];

export function registerSigmaDataSourcesRoute(router: IRouter): void {
  router.get(
    {
      path: '/api/babel/data-sources',
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Index introspection for logsource mapping; uses asCurrentUser' } },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;

      try {
        const cats: any[] = await (client as any).cat.indices({
          h: 'index,docs.count,store.size',
          format: 'json',
          bytes: 'm',
        });

        const byProduct: Record<string, { indices: string[]; docs: number; categories: Set<string> }> = {};

        for (const row of cats) {
          const indexName: string = row.index ?? '';
          if (indexName.startsWith('.') && !indexName.startsWith('.alerts') && !indexName.startsWith('.siem')) continue;

          const docs = parseInt(row['docs.count'] ?? '0', 10) || 0;

          for (const entry of INDEX_PRODUCT_MAP) {
            if (entry.pattern.test(indexName)) {
              if (!byProduct[entry.product]) {
                byProduct[entry.product] = { indices: [], docs: 0, categories: new Set() };
              }
              byProduct[entry.product].indices.push(indexName);
              byProduct[entry.product].docs += docs;
              byProduct[entry.product].categories.add(entry.category);
              break;
            }
          }
        }

        const sources = KNOWN_PRODUCTS.map(product => {
          const found = byProduct[product];
          const entry = INDEX_PRODUCT_MAP.find(e => e.product === product);
          return {
            product,
            label: entry?.label ?? product,
            available: !!found && found.docs > 0,
            index_count: found?.indices.length ?? 0,
            doc_count: found?.docs ?? 0,
            indices: found?.indices.slice(0, 5) ?? [],
            categories: found ? [...found.categories] : [],
          };
        });

        return response.ok({ body: { sources } });
      } catch (err: unknown) {
        return response.internalError({ body: { message: err instanceof Error ? err.message : 'Failed to introspect data sources' } });
      }
    }
  );
}
