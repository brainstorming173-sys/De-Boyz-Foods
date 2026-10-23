# De-Boyz Foods

Groceries and hot Ghanaian meals, ordered online (guest checkout, pay on delivery or pay now with MTN MoMo, Telecel Cash or AirtelTigo Money).

**Stack:** React 18 + Vite + Tailwind + lucide-react · Express (ESM) · PostgreSQL (Neon) · JWT auth · Multer → Cloudinary · Resend · MTN MoMo API · manual mobile money (Telecel, AirtelTigo)

## Run locally

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET at minimum
npm run db:schema           # creates the tables in Neon
npm run seed                # creates the admin user + starter grocery categories
npm run dev:all             # API on :4000, web on http://localhost:5173
```

Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`, then open `/admin`.

Without `RESEND_API_KEY`, verification and reset emails are printed in the API terminal.
Without Cloudinary keys, image upload returns a clear 503 and everything else still works.

## Folder map

```
client/                 React app (Vite root)
  src/api.js            every frontend -> backend call
  src/context/          Auth + Cart state
  src/pages/            Home, Groceries, Food, Cart (checkout), OrderDone, auth pages, admin/
  public/images/        drop groceries.jpg and food.jpg here for the home hero cards
server/
  index.js              Express app, serves client/dist in production
  config.js             env parsing
  db/                   db.js (pool), schema.sql, store.js (ALL SQL), seed.js, migrate.js
  routes/               auth, catalog, orders, payments, uploads
  middleware/           auth (JWT), upload (Multer), error
  services/             cloudinary, email (Resend), payments (router), mtnmomo (MTN, direct), momo (networks + number helpers)
render.yaml             one Render web service
```

## Deploy to Render

1. Push to GitHub, then in Render choose **New > Blueprint** and select the repo (it reads `render.yaml`).
2. Fill the `sync: false` env vars. Set `CLIENT_ORIGIN` to your Render URL (used in email links).
3. Run `npm run db:schema` and `npm run seed` once against your Neon database (locally is fine).
4. Health check: `/api/health`.

## Pay now with mobile money

The customer picks their network (MTN, Telecel or AirtelTigo) and enters their number. The prefix pre-selects a network, but the customer's choice wins because numbers can be ported between networks. Their phone gets a PIN prompt and the page polls until the provider confirms. `server/services/payments.js` routes each network to its provider.

### MTN MoMo (direct, no payment aggregator)

Calls MTN's MoMo Collections API ("Request to Pay") straight from the server.

- `MOMO_ENV=mock` (default locally): no MTN account needed. Auto-approves 8 seconds after the prompt so you can test the screens.
- `MOMO_ENV=sandbox`: sign up at momodeveloper.mtn.com, subscribe to **Collections**, put the Primary key in `MOMO_SUBSCRIPTION_KEY`, then run `npm run momo:sandbox` and paste the printed API user and key into `.env`. The sandbox sends no real prompts.
- `MOMO_ENV=production`: needs MTN Ghana to approve your business for live collections. They give you the production subscription key, API user and key. Set `MOMO_CALLBACK_URL` to `https://<your-app>.onrender.com/api/payments/momo/callback` (it must match what you register with MTN).

### Telecel Cash and AirtelTigo Money (manual)

Telecel and AirtelTigo have no open collections API like MTN's, so these two are confirmed by hand. MTN stays automatic.

- At checkout the customer picks Telecel or AirtelTigo, and the pay page shows the numbers to send money to (`MANUAL_PAY_NUMBERS`, default `0538927692,0201753511`).
- After sending, the customer enters the transaction ID from their confirmation SMS and the number they sent from. The order stays unpaid until you confirm it.
- In the admin dashboard, each Telecel / AirtelTigo order shows the transaction ID and sender. Check the money arrived, then press **Mark paid** (or **Reject**). The customer's page updates by itself.
- A transaction ID can only be used on one order.
- Run `npm run db:schema` once after updating. It adds the `payment_txn_id` and `payment_sender` columns (safe to re-run).

## Notes

- Prices are always re-read from the database at checkout; the client never sets them.
- An MTN payment only counts as paid after the server asks MTN directly and the amount and currency match. Telecel and AirtelTigo payments only count once an admin marks them paid.
- Only one `.env` at the project root is used by both the API and Vite (`VITE_` vars).
