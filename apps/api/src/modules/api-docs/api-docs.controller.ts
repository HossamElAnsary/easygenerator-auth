import type { OpenApiDocument } from '@easy-generator/contracts/openapi';
import {
  Controller,
  Get,
  Header,
  Inject,
  type StreamableFile,
} from '@nestjs/common';
import { Public } from '../auth/index.js';
import { API_DOCUMENT } from './api-docs.document.js';
import { SwaggerUiAssets } from './swagger-ui-assets.js';
import { SWAGGER_UI_INITIALIZER, SWAGGER_UI_PAGE } from './swagger-ui-page.js';

/**
 * The OpenAPI document and Swagger UI (Requirements B05). Public and
 * read-only; AppModule registers this only outside production (A09). Each
 * file has its own route, so nothing else in the package can be requested.
 */
@Controller()
export class ApiDocsController {
  constructor(
    @Inject(SwaggerUiAssets) private readonly assets: SwaggerUiAssets,
  ) {}

  @Public()
  @Get('openapi.json')
  document(): OpenApiDocument {
    return API_DOCUMENT;
  }

  @Public()
  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  page(): string {
    return SWAGGER_UI_PAGE;
  }

  @Public()
  @Get('docs/swagger-initializer.js')
  @Header('Content-Type', 'text/javascript; charset=utf-8')
  initializer(): string {
    return SWAGGER_UI_INITIALIZER;
  }

  @Public()
  @Get('docs/swagger-ui.css')
  stylesheet(): StreamableFile {
    return this.assets.file('swagger-ui.css');
  }

  @Public()
  @Get('docs/swagger-ui-bundle.js')
  bundle(): StreamableFile {
    return this.assets.file('swagger-ui-bundle.js');
  }

  @Public()
  @Get('docs/favicon-32x32.png')
  icon(): StreamableFile {
    return this.assets.file('favicon-32x32.png');
  }
}
