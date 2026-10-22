import { Module } from '@nestjs/common';
import { ApiDocsController } from './api-docs.controller.js';
import { SwaggerUiAssets } from './swagger-ui-assets.js';

/** OpenAPI document and Swagger UI; imported by AppModule outside production. */
@Module({
  controllers: [ApiDocsController],
  providers: [SwaggerUiAssets],
})
export class ApiDocsModule {}
