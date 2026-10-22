// Writes docs/openapi.json from the compiled API, the same document that
// GET /api/openapi.json serves. A test fails when the committed file is stale.
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';

const { API_DOCUMENT } = await import(
  new URL(
    '../apps/api/dist/modules/api-docs/api-docs.document.js',
    import.meta.url,
  ).href
);

await writeFile(
  new URL('../docs/openapi.json', import.meta.url),
  `${JSON.stringify(API_DOCUMENT, null, 2)}\n`,
);
