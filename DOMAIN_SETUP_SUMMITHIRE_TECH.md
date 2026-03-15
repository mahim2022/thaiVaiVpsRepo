# Domain Setup Runbook - summithire.tech

This document records the full process used to bring the Medusa backend and storefront live on:

- https://summithire.tech (primary)
- https://www.summithire.tech (redirect to primary)

## 1) What needed to be done

1. Point domain DNS to the VPS.
2. Update app and proxy configs to use the domain instead of IP/localhost.
3. Configure Nginx host routing:
- HTTP -> HTTPS
- www -> apex redirect
- proxy routing to storefront and backend paths
4. Issue Let's Encrypt TLS cert for both hostnames.
5. Deploy cert to Nginx and verify URLs.

## 2) .techDomains dashboard settings

Required records:

1. A record
- Host/Name: @
- Value: 157.245.149.4
- TTL: default or 300

2. CNAME record
- Host/Name: www
- Value/Target: summithire.tech
- TTL: default (28800 is fine)

Optional recommended record:

3. CAA record
- Host/Name: @
- Value: 0 issue "letsencrypt.org"

Notes:

1. Do not keep both A and CNAME for www at the same time.
2. Keep DNSSEC disabled unless DS records are correctly configured.

## 3) Project configuration changes

### Nginx routing

Configured in nginx/default.conf:

1. server_name includes summithire.tech and www.summithire.tech.
2. Port 80 redirects all traffic to HTTPS.
3. https://www.summithire.tech redirects to https://summithire.tech.
4. https://summithire.tech routes:
- /, storefront -> http://storefront:8000
- /store/, /admin/, /auth/, /static/, /app, backend -> http://medusa:9000

### Backend env (.env)

Domain-related values:

- STORE_CORS includes https://summithire.tech and https://www.summithire.tech
- ADMIN_CORS includes both domain variants
- AUTH_CORS includes both domain variants
- COOKIE_SECURE=true
- MEDUSA_BACKEND_URL=https://summithire.tech
- MEDUSA_FILE_BACKEND_URL=https://summithire.tech/static

### Storefront env (my-medusa-storefront/.env)

Domain-related values:

- MEDUSA_BACKEND_URL=https://summithire.tech
- NEXT_PUBLIC_BASE_URL=https://summithire.tech

### Compose/Nginx fallback cert generation

In docker-compose.yml (nginx service command), self-signed fallback cert subject/SAN is set to summithire.tech and www.summithire.tech. This is only fallback; production should use Let's Encrypt cert files.

## 4) Commands used for deployment

### Rebuild and start stack

```sh
cd /root/thaiVaiEcom2.0
docker compose up -d --build
```

### Check DNS propagation

```sh
dig +short A summithire.tech @1.1.1.1
dig +short A www.summithire.tech @1.1.1.1
dig +short A summithire.tech @8.8.8.8
dig +short A www.summithire.tech @8.8.8.8
```

### Issue or expand Let's Encrypt cert (standalone)

```sh
cd /root/thaiVaiEcom2.0
docker compose stop nginx
certbot certonly --standalone --expand -d summithire.tech -d www.summithire.tech --agree-tos -m admin@summithire.tech --non-interactive
cp /etc/letsencrypt/live/summithire.tech/fullchain.pem nginx/certs/server.crt
cp /etc/letsencrypt/live/summithire.tech/privkey.pem nginx/certs/server.key
chmod 600 nginx/certs/server.key
docker compose up -d nginx
```

If this is first issuance and not expansion, the same command works without --expand.

## 5) Validation checklist

Run:

```sh
curl -I https://summithire.tech
curl -I https://www.summithire.tech
curl -I https://summithire.tech/app
curl -I https://summithire.tech/store/regions
openssl x509 -in /root/thaiVaiEcom2.0/nginx/certs/server.crt -noout -ext subjectAltName
```

Expected:

1. summithire.tech returns HTTPS response (storefront may redirect to locale path such as /dk).
2. www.summithire.tech returns 301 to https://summithire.tech/.
3. /app returns 200 from Medusa admin.
4. /store/regions is reachable (may return 400 without required publishable key header).
5. Certificate SAN contains both DNS:summithire.tech and DNS:www.summithire.tech.

## 6) Troubleshooting observed during setup

### Issue: Certbot failed with NXDOMAIN for www even when records were added

Cause:

1. DNS propagation and secondary validator cache delay at certificate authority.

What to do:

1. Verify public resolvers and authoritative nameservers all return records.
2. Wait 30 to 120 minutes if LE secondary validation still returns NXDOMAIN.
3. Re-run the same certbot command.

### Issue: Nginx stopped during failed certbot attempt

Cause:

1. Nginx must stop for standalone challenge on port 80.

Recovery:

```sh
cd /root/thaiVaiEcom2.0
docker compose up -d nginx
```

## 7) Final live state

Completed:

1. HTTPS valid on summithire.tech.
2. HTTPS valid on www.summithire.tech.
3. Redirect active: https://www.summithire.tech -> https://summithire.tech.
4. Admin route live at https://summithire.tech/app.
