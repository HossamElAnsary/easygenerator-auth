// The Swagger UI page and its start-up script. The script is a separate file
// because the Content-Security-Policy allows no inline script, and the page
// loads only files served by this module (Architecture A09).

export const SWAGGER_UI_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Easy Generator API</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
    <link rel="icon" type="image/png" href="/api/docs/favicon-32x32.png" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/swagger-initializer.js"></script>
  </body>
</html>
`;

// validatorUrl: null keeps Swagger UI from fetching a badge from
// validator.swagger.io, which the policy would block.
export const SWAGGER_UI_INITIALIZER = `window.addEventListener('load', () => {
  window.ui = SwaggerUIBundle({
    url: '/api/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    validatorUrl: null,
  });
});
`;
