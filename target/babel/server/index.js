"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.config = void 0;
const plugin_1 = require("./plugin");
const config_1 = require("./config");
exports.config = { schema: config_1.configSchema };
const plugin = (context) => {
    return new plugin_1.BabelPlugin(context);
};
exports.plugin = plugin;
//# sourceMappingURL=index.js.map