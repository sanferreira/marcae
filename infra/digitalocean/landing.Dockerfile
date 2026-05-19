FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY . .

RUN pnpm install --frozen-lockfile

ARG APP_BASE_URL
ARG LANDING_BASE_PATH=/
ARG VITE_SUPPORT_URL

ENV NODE_ENV=production
ENV BASE_PATH=$LANDING_BASE_PATH
ENV VITE_APP_WEB_URL=$APP_BASE_URL
ENV VITE_SUPPORT_URL=$VITE_SUPPORT_URL

RUN pnpm --filter @workspace/landing run build

FROM nginx:1.27-alpine

COPY infra/digitalocean/landing.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/landing/dist/public /usr/share/nginx/html

EXPOSE 80
