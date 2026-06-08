"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = void 0;
const config_schema_1 = require("@kbn/config-schema");
exports.configSchema = config_schema_1.schema.object({
    sigmaApiUrl: config_schema_1.schema.string({ defaultValue: 'http://localhost:8001/v1' }),
    kibanaUrl: config_schema_1.schema.string({ defaultValue: 'http://localhost:5601' }),
});
//# sourceMappingURL=config.js.map