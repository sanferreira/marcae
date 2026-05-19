FROM node:22-bookworm-slim

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY . .

RUN pnpm install --frozen-lockfile

ARG APP_DOMAIN
ARG EXPO_PUBLIC_API_URL

ENV EXPO_PUBLIC_DOMAIN=$APP_DOMAIN
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV NODE_ENV=production

RUN pnpm --filter @workspace/mobile run build

ENV PORT=3000
ENV BASE_PATH=/

EXPOSE 3000

CMD ["node", "artifacts/mobile/server/serve.js"]
