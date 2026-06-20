# build context = template root
FROM oven/bun:1.3-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
# Bundle the server (the worker runs in-process, so it's bundled in too) + all deps
# into ONE file — the runtime image carries no node_modules, so its size is fixed
# by the base image and never grows with the dependency count.
RUN bun build apps/api/src/index.ts --target bun --minify --outfile dist/server.js

FROM oven/bun:1.3-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/server.js ./server.js
COPY --from=build /app/apps/api/drizzle ./drizzle
EXPOSE 3000
# Boot only serves (no migrations on boot). Apply migrations explicitly with the
# bundled migrator: `bun server.js migrate` (reads ./drizzle) — see deploy/migrate.sh.
CMD ["bun", "server.js"]
