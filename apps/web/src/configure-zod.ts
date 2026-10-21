import { z } from 'zod';

// Zod compiles object parsers with `new Function` unless it runs jitless. The
// served CSP has no 'unsafe-eval', so Zod's capability probe is blocked and
// reported as a violation even though Zod catches the error. Object schemas
// read this flag when they are created, so main.tsx must import this module
// before anything that loads the shared schemas.
z.config({ jitless: true });
