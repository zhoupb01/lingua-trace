# build context = template root (web build needs api's types for the Hono RPC client)
FROM oven/bun:1.3-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# public client config — non-secret, baked into the bundle
ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ARG VITE_LOGTO_API_RESOURCE
ENV VITE_LOGTO_ENDPOINT=$VITE_LOGTO_ENDPOINT \
    VITE_LOGTO_APP_ID=$VITE_LOGTO_APP_ID \
    VITE_LOGTO_API_RESOURCE=$VITE_LOGTO_API_RESOURCE

WORKDIR /app/apps/web
RUN bun run build

FROM nginx:1-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
