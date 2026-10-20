import 'reflect-metadata';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module.js';
import type { RuntimeConfig } from './config/runtime-config.js';
import { DatabaseService } from './database/database.service.js';

export const WEB_DIRECTORY = fileURLToPath(
  new URL('../../web/dist/', import.meta.url),
);

export async function createApplication(
  config: RuntimeConfig,
): Promise<NestExpressApplication> {
  if (config.serveWeb) {
    try {
      if (!(await stat(`${WEB_DIRECTORY}/index.html`)).isFile())
        throw new Error();
    } catch {
      throw new Error('Web assets are missing. Run npm run build.');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(config),
    {
      logger: false,
      abortOnError: false,
      bodyParser: false,
    },
  );
  try {
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);
    app.use(express.json({ limit: '16kb', strict: true }));
    if (config.serveWeb) {
      const assets = express.static(WEB_DIRECTORY, {
        index: false,
        redirect: false,
      });
      app.use(
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction,
        ) => {
          if (
            req.path === '/api' ||
            req.path.startsWith('/api/') ||
            !['GET', 'HEAD'].includes(req.method)
          ) {
            next();
            return;
          }
          assets(req, res, () => {
            if (req.path.startsWith('/assets/') || extname(req.path)) {
              res.status(404).end();
              return;
            }
            res.setHeader('Cache-Control', 'no-cache');
            res.sendFile(`${WEB_DIRECTORY}/index.html`, (error) => {
              if (error && !res.headersSent) res.status(500).end();
            });
          });
        },
      );
    }
    await app.get(DatabaseService).initialize();
    await app.init();
    return app;
  } catch {
    await app.close().catch(() => undefined);
    throw new Error('Application startup checks failed.');
  }
}
