import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { readFileSync, existsSync } from 'fs';
import { resolve, join, extname, normalize } from 'path';

function findStaticDir(): string {
  // Installed: server/routes/ → two levels up → target/static
  const installed = resolve(__dirname, '../../target/static');
  if (existsSync(installed)) return installed;
  // Dev build: target/server/routes/ → three levels up → target/static
  const dev = resolve(__dirname, '../../../target/static');
  if (existsSync(dev)) return dev;
  throw new Error(`Cannot find static dir from ${__dirname}`);
}

const MIME: Record<string, string> = {
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
};

export function registerStaticAppRoute(router: IRouter): void {
  const staticDir = findStaticDir();

  // Serve index.html
  router.get(
    { path: '/api/babel/app', validate: false, options: { access: 'public' }, security: { authz: { enabled: false, reason: 'Static file serving' } } },
    (_ctx, _req, res) => {
      const html = readFileSync(join(staticDir, 'index.html'));
      return res.ok({ body: html, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
  );

  // Serve any static asset (bundle.js, chunks, fonts, etc.)
  router.get(
    {
      path: '/api/babel/app/{fileName}',
      validate: { params: schema.object({ fileName: schema.string() }) },
      options: { access: 'public' },
      security: { authz: { enabled: false, reason: 'Static file serving' } },
    },
    (_ctx, req, res) => {
      const fileName = (req.params as { fileName: string }).fileName;

      // Prevent path traversal
      const safe = normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = join(staticDir, safe);

      if (!filePath.startsWith(staticDir) || !existsSync(filePath)) {
        return res.notFound();
      }

      const content = readFileSync(filePath);
      const mime = MIME[extname(filePath)] ?? 'application/octet-stream';
      return res.ok({ body: content, headers: { 'content-type': mime } });
    }
  );
}
