import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Injectable, type OnModuleInit, StreamableFile } from '@nestjs/common';

/** The only `swagger-ui-dist` files the page needs, and their types. */
export const SWAGGER_UI_FILES = {
  'swagger-ui.css': 'text/css; charset=utf-8',
  'swagger-ui-bundle.js': 'text/javascript; charset=utf-8',
  'favicon-32x32.png': 'image/png',
} as const;

export type SwaggerUiFile = keyof typeof SWAGGER_UI_FILES;

/**
 * Reads the files once at startup, so a missing package fails startup rather
 * than a request, and serving never touches the install path.
 */
@Injectable()
export class SwaggerUiAssets implements OnModuleInit {
  private readonly files = new Map<SwaggerUiFile, Buffer>();

  async onModuleInit(): Promise<void> {
    const directory = dirname(
      createRequire(import.meta.url).resolve('swagger-ui-dist/package.json'),
    );
    for (const name of Object.keys(SWAGGER_UI_FILES) as SwaggerUiFile[])
      this.files.set(name, await readFile(join(directory, name)));
  }

  file(name: SwaggerUiFile): StreamableFile {
    const contents = this.files.get(name);
    if (!contents) throw new Error('Swagger UI assets are not loaded.');
    return new StreamableFile(contents, {
      type: SWAGGER_UI_FILES[name],
      length: contents.length,
    });
  }
}
