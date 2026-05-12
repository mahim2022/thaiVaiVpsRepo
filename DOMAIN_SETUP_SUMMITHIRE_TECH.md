# Domain Setup Runbook - thaibhai.shop

This document records the full process used to bring the Medusa backend and storefront live on:

- https://thaibhai.shop (primary)
- https://www.thaibhai.shop (redirect to primary)

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
- Value/Target: thaibhai.shop
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

1. server_name includes thaibhai.shop and www.thaibhai.shop.
2. Port 80 redirects all traffic to HTTPS.
3. https://www.thaibhai.shop redirects to https://thaibhai.shop.
4. https://thaibhai.shop routes:
- /, storefront -> http://storefront:8000
- /store/, /admin/, /auth/, /static/, /app, backend -> http://medusa:9000

### Backend env (.env)

Domain-related values:

- STORE_CORS includes https://thaibhai.shop and https://www.thaibhai.shop
- ADMIN_CORS includes both domain variants
- AUTH_CORS includes both domain variants
- COOKIE_SECURE=true
- MEDUSA_BACKEND_URL=https://thaibhai.shop
- MEDUSA_FILE_BACKEND_URL=https://thaibhai.shop/static

### Storefront env (my-medusa-storefront/.env)

Domain-related values:

- MEDUSA_BACKEND_URL=https://thaibhai.shop
- NEXT_PUBLIC_BASE_URL=https://thaibhai.shop

### Compose/Nginx fallback cert generation

In docker-compose.yml (nginx service command), self-signed fallback cert subject/SAN is set to thaibhai.shop and www.thaibhai.shop. This is only fallback; production should use Let's Encrypt cert files.

## 4) Commands used for deployment

### Rebuild and start stack

```sh
cd /root/thaiVaiEcom2.0
docker compose up -d --build
```

### Check DNS propagation

```sh
dig +short A thaibhai.shop @1.1.1.1
dig +short A www.thaibhai.shop @1.1.1.1
dig +short A thaibhai.shop @8.8.8.8
dig +short A www.thaibhai.shop @8.8.8.8
```

### Issue or expand Let's Encrypt cert (standalone)

```sh
cd /root/thaiVaiEcom2.0
docker compose stop nginx
certbot certonly --standalone --expand -d thaibhai.shop -d www.thaibhai.shop --agree-tos -m admin@thaibhai.shop --non-interactive
cp /etc/letsencrypt/live/thaibhai.shop/fullchain.pem nginx/certs/server.crt
cp /etc/letsencrypt/live/thaibhai.shop/privkey.pem nginx/certs/server.key
chmod 600 nginx/certs/server.key
docker compose up -d nginx
```

If this is first issuance and not expansion, the same command works without --expand.

## 5) Validation checklist

Run:

```sh
curl -I https://thaibhai.shop
curl -I https://www.thaibhai.shop
curl -I https://thaibhai.shop/app
curl -I https://thaibhai.shop/store/regions
openssl x509 -in /root/thaiVaiEcom2.0/nginx/certs/server.crt -noout -ext subjectAltName
```

Expected:

1. thaibhai.shop returns HTTPS response (storefront may redirect to locale path such as /dk).
2. www.thaibhai.shop returns 301 to https://thaibhai.shop/.
3. /app returns 200 from Medusa admin.
4. /store/regions is reachable (may return 400 without required publishable key header).
5. Certificate SAN contains both DNS:thaibhai.shop and DNS:www.thaibhai.shop.

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

1. HTTPS valid on thaibhai.shop.
2. HTTPS valid on www.thaibhai.shop.
3. Redirect active: https://www.thaibhai.shop -> https://thaibhai.shop.
4. Admin route live at https://thaibhai.shop/app.
