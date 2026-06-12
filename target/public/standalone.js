"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const client_1 = require("react-dom/client");
const App_1 = require("./components/App");
const KibanaContext_1 = require("./context/KibanaContext");
const standaloneHttp = {
    get: async (url, options) => {
        const params = new URLSearchParams(Object.entries(options?.query ?? {})
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]));
        const fullUrl = params.toString() ? `${url}?${params}` : url;
        const res = await fetch(fullUrl, { credentials: 'same-origin' });
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    },
    post: async (url, options) => {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'kbn-xsrf': 'true' },
            body: options?.body,
        });
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    },
};
const container = document.getElementById('root');
(0, client_1.createRoot)(container).render((0, jsx_runtime_1.jsx)(KibanaContext_1.KibanaProvider, { services: { http: standaloneHttp }, children: (0, jsx_runtime_1.jsx)(App_1.App, {}) }));
//# sourceMappingURL=standalone.js.map