/**
 * The API's module boundaries (Engineering E02, Verification T18). `npm run
 * lint` runs these over apps/api/src, unit tests beside their sources
 * included; the integration suites in apps/api/test may import internals.
 */
const SRC = '^apps/api/src/';
const MODULES = `${SRC}modules/`;
const MODULE_INDEX = `${MODULES}[^/]+/index\\.ts$`;

export default {
  forbidden: [
    {
      name: 'module-internals-from-another-module',
      severity: 'error',
      comment:
        'E02 rule 1: another feature module is reached only through its index.ts.',
      from: { path: `${MODULES}([^/]+)/` },
      to: {
        path: MODULES,
        pathNot: [`${MODULES}$1/`, MODULE_INDEX],
      },
    },
    {
      name: 'module-internals-from-outside',
      severity: 'error',
      comment:
        'E02 rule 1: code outside modules/, the composition root included, imports a module only through its index.ts.',
      from: { path: SRC, pathNot: MODULES },
      to: { path: MODULES, pathNot: MODULE_INDEX },
    },
    {
      name: 'module-index-exposes-adapter',
      severity: 'error',
      comment:
        'E02 rule 1: an index.ts never re-exports an adapter or schema, which would hand their database or hashing types to other modules.',
      from: { path: MODULE_INDEX },
      to: {
        path: '\\.(mongo-repository|schema)\\.ts$|/argon2-password-hasher\\.ts$',
      },
    },
    {
      name: 'lower-module-imports-upward',
      severity: 'error',
      comment:
        'E02 rule 2: users and sessions import neither auth nor each other.',
      from: { path: `${MODULES}(users|sessions)/` },
      to: {
        path: `${MODULES}(auth|users|sessions)/`,
        pathNot: `${MODULES}$1/`,
      },
    },
    {
      name: 'shared-code-imports-module',
      severity: 'error',
      comment:
        'E02 rule 3: config, common, infrastructure, and http never import a feature module.',
      from: { path: `${SRC}(config|common|infrastructure|http)/` },
      to: { path: MODULES },
    },
    {
      name: 'database-library-outside-persistence',
      severity: 'error',
      comment:
        'E02 rule 4: only MongoDB adapters, schemas, the users and sessions module files (which register models), infrastructure/database, config, and the composition root import Mongoose or the MongoDB driver.',
      from: {
        path: SRC,
        pathNot: [
          '\\.mongo-repository\\.ts$',
          '\\.schema\\.ts$',
          `${MODULES}(users|sessions)/[^/]+\\.module\\.ts$`,
          `${SRC}infrastructure/database/`,
          `${SRC}config/`,
          `${SRC}[^/]+\\.ts$`,
        ],
      },
      to: {
        path: '(^|/)node_modules/(mongoose|@nestjs/mongoose|mongodb|bson)/',
      },
    },
    {
      name: 'argon2-outside-adapter',
      severity: 'error',
      comment: 'E02 rule 4: only the Argon2 adapter imports argon2.',
      from: { path: SRC, pathNot: '/argon2-password-hasher\\.ts$' },
      to: { path: '(^|/)node_modules/argon2/' },
    },
    {
      name: 'production-imports-test',
      severity: 'error',
      comment:
        'Engineering E06: unit tests sit beside their sources, and production code never imports one.',
      from: { path: SRC, pathNot: '\\.test\\.ts$' },
      to: { path: '\\.test\\.ts$' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'E02 rule 5: no import cycles.',
      from: { path: SRC },
      to: { circular: true },
    },
    {
      name: 'unresolvable-import',
      severity: 'error',
      comment:
        'Every import must resolve, or the rules above could pass by not seeing it. The contracts package resolves only after its build, which lint precedes.',
      from: { path: SRC },
      to: { couldNotResolve: true, pathNot: '^@easy-generator/contracts$' },
    },
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
