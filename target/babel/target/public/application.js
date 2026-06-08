"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderApp = renderApp;
const jsx_runtime_1 = require("react/jsx-runtime");
const client_1 = require("react-dom/client");
const KibanaContext_1 = require("./context/KibanaContext");
const App_1 = require("./components/App");
function renderApp({ element }, services) {
    const root = (0, client_1.createRoot)(element);
    root.render((0, jsx_runtime_1.jsx)(KibanaContext_1.KibanaProvider, { services: services, children: (0, jsx_runtime_1.jsx)(App_1.App, {}) }));
    return () => root.unmount();
}
//# sourceMappingURL=application.js.map