import 'reflect-metadata';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { RuntimeConfig } from './config/runtime-config.js';
import { isApiPath } from './http/api-paths.js';
import { JSON_BODY_LIMIT } from './http/limits.js';
import { mutationControls } from './http/mutation-controls.js';
import { requestContext } from './http/request-context.js';
import { securityHeaderOptions } from './http/security-headers.js';
import { createValidationPipe } from './http/validation.js';
import { DatabaseService } from './infrastructure/database/database.service.js';
import { AppLogger } from './infrastructure/logging/app-logger.js';

export const WEB_DIRECTORY = fileURLToPath(
  new URL('../../web/dist/', import.meta.url),
);

/** Shared by the production factory and the integration-test harness. */
export const NEST_APPLICATION_OPTIONS = {
  logger: false,
  abortOnError: false,
  bodyParser: false,
} as const;

export async function createApplication(
  config: RuntimeConfig,
): Promise<NestExpressApplication> {
  if (config.serveWeb) await assertWebAssets(WEB_DIRECTORY);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(config),
    NEST_APPLICATION_OPTIONS,
  );
  return startApplication(app, config, WEB_DIRECTORY);
}

export async function assertWebAssets(webDirectory: string): Promise<void> {
  try {
    if (!(await stat(join(webDirectory, 'index.html'))).isFile())
      throw new Error();
  } catch {
    throw new Error('Web assets are missing. Run npm run build.');
  }
}

/**
 * Applies the HTTP pipeline, opens the database, and initializes Nest. Any
 * failure closes the application and reports one generic error.
 */
export async function startApplication(
  app: NestExpressApplication,
  config: RuntimeConfig,
  webDirectory: string,
): Promise<NestExpressApplication> {
  try {
    configureHttp(app, config, webDirectory);
    await app.get(DatabaseService).initialize();
    await app.init();
    return app;
  } catch {
    await app.close().catch(() => undefined);
    throw new Error('Application startup checks failed.');
  }
}

function configureHttp(
  app: NestExpressApplication,
  config: RuntimeConfig,
  webDirectory: string,
): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  // Order matters: every response gets a request ID, and the mutation
  // controls run before any body is read (Architecture A07).
  app.use(requestContext(app.get(AppLogger)));
  app.use(helmet(securityHeaderOptions(config)));
  app.use('/api', mutationControls(config.appOrigin));
  app.use(
    express.json({ limit: JSON_BODY_LIMIT, strict: true, inflate: false }),
  );
  app.use(cookieParser());
  if (config.serveWeb) app.use(serveWebApplication(webDirectory));
}

/** Serves built assets and the SPA shell; never answers `/api` paths. */
function serveWebApplication(webDirectory: string): express.RequestHandler {
  const assets = express.static(webDirectory, {
    index: false,
    redirect: false,
  });
  return (req, res, next) => {
    if (isApiPath(req.path) || !['GET', 'HEAD'].includes(req.method)) {
      next();
      return;
    }
    assets(req, res, (error?: unknown) => {
      // serve-static forwards an error only for a file that exists (a range,
      // precondition, or read failure); keep its status. A missing file falls
      // through without one.
      if (error) {
        if (res.headersSent) res.destroy();
        else res.status(httpStatusOf(error)).end();
        return;
      }
      if (req.path.startsWith('/assets/') || extname(req.path)) {
        res.status(404).end();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      // Relative to `root`: without one, send treats a dot-directory anywhere
      // in the install path as a hidden file and answers 404.
      res.sendFile('index.html', { root: webDirectory }, (error) => {
        if (!error) return;
        if (res.headersSent) res.destroy();
        else res.status(500).end();
      });
    });
  };
}

/** The HTTP status carried by a static-file error, or 500 without one. */
function httpStatusOf(error: unknown): number {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? error.status
      : undefined;
  return typeof status === 'number' && status >= 400 && status < 600
    ? status
    : 500;
}
