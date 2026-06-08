"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KibanaProvider = void 0;
exports.useKibana = useKibana;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const KibanaContext = (0, react_1.createContext)(null);
const KibanaProvider = ({ services, children, }) => (0, jsx_runtime_1.jsx)(KibanaContext.Provider, { value: services, children: children });
exports.KibanaProvider = KibanaProvider;
function useKibana() {
    const ctx = (0, react_1.useContext)(KibanaContext);
    if (!ctx)
        throw new Error('useKibana must be used within KibanaProvider');
    return ctx;
}
//# sourceMappingURL=KibanaContext.js.map