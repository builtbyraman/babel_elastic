"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStaticAppRoute = registerStaticAppRoute;
const config_schema_1 = require("@kbn/config-schema");
const fs_1 = require("fs");
const path_1 = require("path");
function findStaticDir() {
    // Installed: server/routes/ → two levels up → target/static
    const installed = (0, path_1.resolve)(__dirname, '../../target/static');
    if ((0, fs_1.existsSync)(installed))
        return installed;
    // Dev build: target/server/routes/ → three levels up → target/static
    const dev = (0, path_1.resolve)(__dirname, '../../../target/static');
    if ((0, fs_1.existsSync)(dev))
        return dev;
    throw new Error(`Cannot find static dir from ${__dirname}`);
}
const MIME = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};
function registerStaticAppRoute(router) {
    const staticDir = findStaticDir();
    // Serve index.html
    router.get({ path: '/api/babel/app', validate: false, options: { access: 'public' }, security: { authz: { enabled: false, reason: 'Static file serving' } } }, (_ctx, _req, res) => {
        const html = (0, fs_1.readFileSync)((0, path_1.join)(staticDir, 'index.html'));
        return res.ok({ body: html, headers: { 'content-type': 'text/html; charset=utf-8' } });
    });
    // Serve any static asset (bundle.js, chunks, fonts, etc.)
    router.get({
        path: '/api/babel/app/{fileName}',
        validate: { params: config_schema_1.schema.object({ fileName: config_schema_1.schema.string() }) },
        options: { access: 'public' },
        security: { authz: { enabled: false, reason: 'Static file serving' } },
    }, (_ctx, req, res) => {
        var _a;
        const fileName = req.params.fileName;
        // Prevent path traversal
        const safe = (0, path_1.normalize)(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = (0, path_1.join)(staticDir, safe);
        if (!filePath.startsWith(staticDir) || !(0, fs_1.existsSync)(filePath)) {
            return res.notFound();
        }
        const content = (0, fs_1.readFileSync)(filePath);
        const mime = (_a = MIME[(0, path_1.extname)(filePath)]) !== null && _a !== void 0 ? _a : 'application/octet-stream';
        return res.ok({ body: content, headers: { 'content-type': mime } });
    });
}
//# sourceMappingURL=static_app.js.map