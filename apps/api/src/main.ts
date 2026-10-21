import { createApplication } from './application.js';
import { LISTEN_HOST, validateRuntimeConfig } from './config/runtime-config.js';

async function bootstrap(): Promise<void> {
  const config = validateRuntimeConfig(process.env);
  const app = await createApplication(config);
  app.enableShutdownHooks();
  try {
    const server = await app.listen(config.port, LISTEN_HOST);
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    console.info('API ready.');
  } catch {
    await app.close();
    throw new Error('API could not listen.');
  }
}

bootstrap().catch(() => {
  // Do not log raw config, driver exceptions, connection strings, or credentials.
  console.error(
    'API startup failed. Check configuration, database readiness, built assets, and that PORT is free.',
  );
  process.exitCode = 1;
});
