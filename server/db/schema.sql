-- De-Boyz Foods schema. Safe to re-run.

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token_hash  TEXT,
  reset_token_hash   TEXT,
  reset_expires_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

-- Groceries & everyday essentials
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  unit         TEXT,
  image_url    TEXT,
  in_stock     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Hot meals, posted per day
CREATE TABLE IF NOT EXISTS meals (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url      TEXT,
  available_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(available_date);

CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  order_no           TEXT NOT NULL UNIQUE,
  user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL = guest checkout
  customer_name      TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT,
  fulfillment        TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfillment IN ('delivery', 'pickup')),
  address            TEXT,
  note               TEXT,
  payment_method     TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'momo', 'momo_now')),
  payment_status     TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_reference  TEXT UNIQUE,   -- payment attempt reference (UUID)
  payment_network    TEXT,          -- mtn | telecel | airteltigo (set when a pay-now attempt starts)
  status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal           NUMERIC(10,2) NOT NULL,
  delivery_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total              NUMERIC(10,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('product', 'meal')),
  item_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  qty         INTEGER NOT NULL CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Migration for databases created before the direct MTN MoMo integration. Safe to re-run.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'paystack_reference') THEN
    ALTER TABLE orders RENAME COLUMN paystack_reference TO payment_reference;
  END IF;
END $$;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
UPDATE orders SET payment_method = 'momo_now' WHERE payment_method = 'paystack';
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'momo', 'momo_now'));

-- Migration for pay-now on Telecel and AirtelTigo (the payment network is recorded per order). Safe to re-run.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_network TEXT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_network_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_network_check CHECK (payment_network IN ('mtn', 'telecel', 'airteltigo'));
UPDATE orders SET payment_network = 'mtn' WHERE payment_method = 'momo_now' AND payment_reference IS NOT NULL AND payment_network IS NULL;

-- Manual pay-now for Telecel and AirtelTigo: the customer sends money and submits the transaction ID,
-- an admin confirms it. Safe to re-run.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_txn_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_sender TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_txn ON orders (UPPER(payment_txn_id)) WHERE payment_txn_id IS NOT NULL;

-- Exact delivery location the customer pinned on the map (rider directions). Safe to re-run.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Receipt emails: remember when the customer's receipt went out so it is never sent twice. Safe to re-run.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_notified_at TIMESTAMPTZ;

-- Google sign-in: accounts created with Google have no password. Safe to re-run.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;

-- Meals that stay on the menu on following days until the admin turns it off. Safe to re-run.
ALTER TABLE meals ADD COLUMN IF NOT EXISTS carry_over BOOLEAN NOT NULL DEFAULT FALSE;

-- Walk-in / phone orders entered by hand in the admin. Safe to re-run.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_item_type_check CHECK (item_type IN ('product', 'meal', 'manual'));
