FROM node:22-bookworm-slim

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8082
ENV AUTH_COOKIE_ENABLED=false

EXPOSE 8082

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
