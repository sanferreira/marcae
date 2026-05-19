# Deploy na DigitalOcean

Este setup usa uma Droplet com Docker Compose:

- `caddy`: proxy reverso com HTTPS automatico.
- `api`: backend em `/api`.
- `mobile`: app web em `/`.
- `landing`: landing page no dominio principal.
- `postgres`: banco interno sem porta publica.

## 1. DNS

Crie registros `A` apontando os dois dominios para o IP da Droplet.

Exemplo:

```text
marcae.net -> IP_DA_DROPLET
app.marcae.net -> IP_DA_DROPLET
```

Use esses dominios em `LANDING_DOMAIN` e `APP_DOMAIN`.

## 2. Droplet

Recomendacao inicial: Ubuntu LTS com 2 GB RAM no minimo. Para compilar tudo na propria Droplet com mais folga, use 4 GB RAM. Depois de criar a Droplet:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Saia e entre novamente no SSH para o grupo `docker` valer.

## 3. Enviar o projeto

No servidor:

```bash
git clone SEU_REPOSITORIO service-provider
cd service-provider
cp infra/digitalocean/.env.example infra/digitalocean/.env
nano infra/digitalocean/.env
```

Preencha:

- `APP_DOMAIN`
- `LANDING_DOMAIN`
- `POSTGRES_PASSWORD`
- `DATABASE_URL` com a mesma senha do Postgres
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_SUPPORT_URL`, se tiver

## 4. Build e banco

```bash
chmod +x infra/digitalocean/deploy.sh infra/digitalocean/backup-postgres.sh
./infra/digitalocean/deploy.sh
```

## 5. Conferir o sistema

Verificar:

```bash
curl -I https://SEU_DOMINIO/api/healthz
docker compose --env-file infra/digitalocean/.env -f infra/digitalocean/docker-compose.prod.yml ps
docker compose --env-file infra/digitalocean/.env -f infra/digitalocean/docker-compose.prod.yml logs -f api
```

## 6. Stripe

No painel da Stripe, configure o endpoint:

```text
https://app.marcae.net/api/stripe/webhook
```

Eventos importantes:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET` e reinicie:

```bash
docker compose --env-file infra/digitalocean/.env -f infra/digitalocean/docker-compose.prod.yml up -d api
```

## Backup rapido

```bash
./infra/digitalocean/backup-postgres.sh
```

Antes de uso comercial, agende backup automatico da Droplet ou do banco.
