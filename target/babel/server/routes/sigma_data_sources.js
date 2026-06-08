"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSigmaDataSourcesRoute = registerSigmaDataSourcesRoute;
const INDEX_PRODUCT_MAP = [
    { pattern: /^winlogbeat-/, product: 'windows', label: 'Windows', category: 'Windows Event Logs (Winlogbeat)' },
    { pattern: /^logs-windows\./, product: 'windows', label: 'Windows', category: 'Windows (Elastic Agent)' },
    { pattern: /^logs-endpoint\.events\./, product: 'endpoint', label: 'Endpoint', category: 'Elastic Endpoint Events' },
    { pattern: /^auditbeat-/, product: 'linux', label: 'Linux', category: 'Linux Audit (Auditbeat)' },
    { pattern: /^logs-linux\./, product: 'linux', label: 'Linux', category: 'Linux (Elastic Agent)' },
    { pattern: /^filebeat-/, product: 'linux', label: 'Linux', category: 'File Logs (Filebeat)' },
    { pattern: /^logs-system\./, product: 'linux', label: 'Linux', category: 'System Logs (Elastic Agent)' },
    { pattern: /^packetbeat-/, product: 'network', label: 'Network', category: 'Network Traffic (Packetbeat)' },
    { pattern: /^logs-network_traffic\./, product: 'network', label: 'Network', category: 'Network Traffic (Elastic Agent)' },
    { pattern: /^logs-aws\./, product: 'aws', label: 'AWS', category: 'AWS CloudTrail / CloudWatch' },
    { pattern: /^logs-gcp\./, product: 'gcp', label: 'GCP', category: 'GCP Logs' },
    { pattern: /^logs-azure\./, product: 'azure', label: 'Azure', category: 'Azure Monitor Logs' },
    { pattern: /^logs-o365\./, product: 'office365', label: 'Office 365', category: 'Microsoft 365 Audit Logs' },
    { pattern: /^logs-okta\./, product: 'okta', label: 'Okta', category: 'Okta System Log' },
    { pattern: /^logs-google_workspace\./, product: 'google_workspace', label: 'Google Workspace', category: 'Google Workspace Logs' },
    { pattern: /^logs-github\./, product: 'github', label: 'GitHub', category: 'GitHub Audit Logs' },
    { pattern: /^\.alerts-/, product: '_alerts', label: 'Security Alerts', category: 'Elastic Security Alerts' },
    { pattern: /^\.siem-signals-/, product: '_alerts', label: 'Security Alerts', category: 'SIEM Detection Alerts' },
];
const KNOWN_PRODUCTS = [
    'windows', 'linux', 'endpoint', 'network',
    'aws', 'gcp', 'azure', 'office365', 'okta', 'google_workspace', 'github',
];
function registerSigmaDataSourcesRoute(router) {
    router.get({
        path: '/api/babel/data-sources',
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Index introspection for logsource mapping; uses asCurrentUser' } },
        validate: false,
    }, async (context, _request, response) => {
        var _a, _b;
        const { elasticsearch } = await context.core;
        const client = elasticsearch.client.asCurrentUser;
        try {
            const cats = await client.cat.indices({
                h: 'index,docs.count,store.size',
                format: 'json',
                bytes: 'm',
            });
            const byProduct = {};
            for (const row of cats) {
                const indexName = (_a = row.index) !== null && _a !== void 0 ? _a : '';
                if (indexName.startsWith('.') && !indexName.startsWith('.alerts') && !indexName.startsWith('.siem'))
                    continue;
                const docs = parseInt((_b = row['docs.count']) !== null && _b !== void 0 ? _b : '0', 10) || 0;
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
                var _a, _b, _c, _d;
                const found = byProduct[product];
                const entry = INDEX_PRODUCT_MAP.find(e => e.product === product);
                return {
                    product,
                    label: (_a = entry === null || entry === void 0 ? void 0 : entry.label) !== null && _a !== void 0 ? _a : product,
                    available: !!found && found.docs > 0,
                    index_count: (_b = found === null || found === void 0 ? void 0 : found.indices.length) !== null && _b !== void 0 ? _b : 0,
                    doc_count: (_c = found === null || found === void 0 ? void 0 : found.docs) !== null && _c !== void 0 ? _c : 0,
                    indices: (_d = found === null || found === void 0 ? void 0 : found.indices.slice(0, 5)) !== null && _d !== void 0 ? _d : [],
                    categories: found ? [...found.categories] : [],
                };
            });
            return response.ok({ body: { sources } });
        }
        catch (err) {
            return response.internalError({ body: { message: err instanceof Error ? err.message : 'Failed to introspect data sources' } });
        }
    });
}
//# sourceMappingURL=sigma_data_sources.js.map