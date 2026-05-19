# Marcae local

`pgAdmin` nao e o banco. O banco aqui continua sendo `PostgreSQL`; o `pgAdmin` sera apenas o painel para administrar esse Postgres.

## Subir o banco

1. `pnpm run db:up`
2. Abra `http://localhost:5050`
3. Login do pgAdmin:
   `admin@admin.com`
   `admin123`
4. O pgAdmin ja sobe com o server do projeto configurado:
   `Marcae Postgres`
5. Dentro dele, abra:
   `Servers > Marcae Postgres > Databases > marcae > Schemas > public > Tables`

Se voce estiver conectando por um pgAdmin instalado fora do Docker, use `localhost` na porta `5433`.

## Configurar a API

1. Copie `artifacts/api-server/.env.example` para `artifacts/api-server/.env`
2. Instale as dependencias com `pnpm install`
3. Gere o schema no banco com `pnpm run db:push`
4. Rode a API com `pnpm run api:dev`

A API sobe por padrao em `http://localhost:8082`.

Se quiser uma URL web local para retorno do Stripe, rode tambem `pnpm run landing:dev`.

## Configurar o app mobile

1. Copie `artifacts/mobile/.env.example` para `artifacts/mobile/.env`
2. Se for usar celular fisico, troque `localhost` pelo IP da sua maquina na mesma rede
3. Rode `pnpm run mobile:dev`

## Stripe fora do Replit

Fora do Replit, o backend passa a aceitar as variaveis abaixo em `artifacts/api-server/.env`:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Se elas ficarem vazias, o projeto ainda sobe localmente, mas o fluxo de cobranca/assinatura fica desabilitado.
