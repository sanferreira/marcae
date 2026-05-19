# Deploy em Droplet com Nginx e Postgres existentes

Use esta alternativa quando a Droplet ja tem Nginx ocupando `80/443` e Postgres local em `5432`.

## Portas usadas

- Nginx publico: `80/443`
- API Marcae: `127.0.0.1:8082`
- App Marcae: `127.0.0.1:3000`
- Landing: arquivos estaticos em `/opt/marcae/artifacts/landing/dist/public`
- Postgres: banco local existente em `127.0.0.1:5432`

## Nginx

Copie `nginx-marcae.conf` para:

```bash
sudo cp infra/digitalocean/bare-metal/nginx-marcae.conf /etc/nginx/sites-available/marcae
sudo ln -s /etc/nginx/sites-available/marcae /etc/nginx/sites-enabled/marcae
sudo nginx -t
sudo systemctl reload nginx
```

Depois emita HTTPS:

```bash
sudo certbot --nginx -d marcae.net -d app.marcae.net
```

## Systemd

Copie os servicos:

```bash
sudo cp infra/digitalocean/bare-metal/marcae-api.service /etc/systemd/system/marcae-api.service
sudo cp infra/digitalocean/bare-metal/marcae-app.service /etc/systemd/system/marcae-app.service
sudo systemctl daemon-reload
sudo systemctl enable --now marcae-api marcae-app
```

Logs:

```bash
sudo journalctl -u marcae-api -f
sudo journalctl -u marcae-app -f
```
