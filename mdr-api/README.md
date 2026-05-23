# Million Dollar Receipt API

External serverless backend for Stripe checkout, webhook confirmation, and receipt storage.

## Local development

```bash
node mdr-api/server.js
```

Listens on `http://127.0.0.1:8787` by default.

Environment variables:

| Variable | Purpose |
|----------|---------|
| `MDR_API_PORT` | Local port (default `8787`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (omit for mock checkout) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `MDR_SITE_URL` | Public site origin for redirect URLs |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stats` | Counter + recent receipts |
| GET | `/receipts` | Paginated list (`cursor`, `limit`, `q`, `tier`) |
| GET | `/receipts/:number` | Single receipt |
| GET | `/receipts/random` | Random receipt |
| POST | `/checkout/create` | `{ alias, message }` → checkout URL |
| POST | `/webhooks/stripe` | Stripe webhook handler |

## Moderation policy

- Alias appears on the receipt line immediately after payment.
- Optional messages start as `pending` until moderated.
- Receipt lines without messages show immediately.

## Deployment

Deploy `handlers.js` + D1 schema to Cloudflare Workers (or equivalent serverless platform). Point the frontend `apiBase` in `content/million-dollar-receipt.json` at the deployed API URL.

Rebuild stats snapshot:

```bash
MDR_API_BASE=https://your-api.example node scripts/build-mdr-stats.js
```
