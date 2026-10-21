# The application image (Architecture A12): the NestJS API serving the compiled
# React UI, exactly as `npm run preview` and `npm run start:prod` run it.
FROM node:24.22.0-trixie-slim@sha256:a6155384446670e9719bdc4fd0ebe4d4b29fb32a8d6aa523da3547a6cfbcf22c AS node

FROM node AS npm
WORKDIR /app
# Node 24.22.0 bundles npm 11.19.1; .npmrc's engine-strict requires 12.2.0.
RUN npm install --global npm@12.2.0 --no-audit --no-fund
COPY package.json package-lock.json .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

FROM npm AS build
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build

# Production dependencies of the API (and the contracts it imports) only.
FROM npm AS runtime-files
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace @easy-generator/api --no-audit --no-fund
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
RUN find packages apps -name '*.map' -delete

FROM node
# The runtime never installs packages, so it carries no package manager.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
COPY --from=runtime-files /app ./
USER node
# Run Node directly so SIGTERM reaches Nest's shutdown hooks.
CMD ["node", "apps/api/dist/main.js"]
