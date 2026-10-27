// All SQL lives here. Route handlers call these functions and never write queries themselves.
import crypto from 'node:crypto';
import { query, tx } from './db.js';
import { config } from '../config.js';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ---------------- users ---------------- */
const publicUser = `id, name, email, phone, role, email_verified, created_at`;

export const users = {
  async create({ name, email, phone, passwordHash, verifyTokenHash }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash, verify_token_hash)
       VALUES ($1, LOWER($2), $3, $4, $5) RETURNING ${publicUser}`,
      [name, email, phone || null, passwordHash, verifyTokenHash]
    );
    return rows[0];
  },
  // Saves the mobile number (used when someone signed up with Google, which gives no phone).
  async setPhone(id, phone) {
    const { rows } = await query(`UPDATE users SET phone = $2 WHERE id = $1 RETURNING ${publicUser}`, [id, phone]);
    return rows[0];
  },
  // Admin: every customer with their contact details and orders.
  async listWithOrders() {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(o.id)::int AS order_count,
              COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0) AS total_spent,
              COALESCE(json_agg(json_build_object(
                'order_no', o.order_no, 'status', o.status, 'total', o.total,
                'fulfillment', o.fulfillment, 'created_at', o.created_at,
                'items', (SELECT string_agg(i.qty || ' x ' || i.name, ', ') FROM order_items i WHERE i.order_id = o.id)
              ) ORDER BY o.created_at DESC) FILTER (WHERE o.id IS NOT NULL), '[]') AS orders
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer'
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`
    );
    return rows;
  },
  async findByGoogleId(googleId) {
    const { rows } = await query(`SELECT ${publicUser} FROM users WHERE google_id = $1`, [googleId]);
    return rows[0];
  },
  async createFromGoogle({ name, email, googleId }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, google_id, email_verified)
       VALUES ($1, LOWER($2), NULL, $3, TRUE) RETURNING ${publicUser}`,
      [name, email, googleId]
    );
    return rows[0];
  },
  // Links Google to an existing email account. Google has verified the address, so it becomes verified.
  // If the account's email was never verified, someone else may have registered it first, so the old
  // password and any pending tokens are wiped: only the real owner (via Google) can get in.
  async linkGoogle(id, googleId) {
    const { rows } = await query(
      `UPDATE users SET google_id = $2,
         password_hash = CASE WHEN email_verified THEN password_hash ELSE NULL END,
         email_verified = TRUE, verify_token_hash = NULL, reset_token_hash = NULL, reset_expires_at = NULL
       WHERE id = $1 RETURNING ${publicUser}`,
      [id, googleId]
    );
    return rows[0];
  },
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
    return rows[0];
  },
  async findById(id) {
    const { rows } = await query(`SELECT ${publicUser} FROM users WHERE id = $1`, [id]);
    return rows[0];
  },
  async verifyEmail(tokenHash) {
    const { rows } = await query(
      `UPDATE users SET email_verified = TRUE, verify_token_hash = NULL
       WHERE verify_token_hash = $1 RETURNING ${publicUser}`,
      [tokenHash]
    );
    return rows[0];
  },
  async setResetToken(id, tokenHash, expiresAt) {
    await query('UPDATE users SET reset_token_hash = $2, reset_expires_at = $3 WHERE id = $1', [
      id, tokenHash, expiresAt,
    ]);
  },
  async resetPassword(tokenHash, passwordHash) {
    const { rows } = await query(
      `UPDATE users SET password_hash = $2, reset_token_hash = NULL, reset_expires_at = NULL
       WHERE reset_token_hash = $1 AND reset_expires_at > NOW() RETURNING ${publicUser}`,
      [tokenHash, passwordHash]
    );
    return rows[0];
  },
};

/* ---------------- categories ---------------- */
export const categories = {
  async list() {
    const { rows } = await query('SELECT * FROM categories ORDER BY name');
    return rows;
  },
  async create(name) {
    const { rows } = await query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slugify(name)]
    );
    return rows[0];
  },
};

/* ---------------- products (groceries) ---------------- */
export const products = {
  async list({ categoryId, q, includeOutOfStock = true } = {}) {
    const where = [];
    const params = [];
    if (categoryId) { params.push(categoryId); where.push(`p.category_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`p.name ILIKE $${params.length}`); }
    if (!includeOutOfStock) where.push('p.in_stock = TRUE');
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY p.created_at DESC`,
      params
    );
    return rows;
  },
  async get(id) {
    const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0];
  },
  async create(d) {
    const { rows } = await query(
      `INSERT INTO products (category_id, name, description, price, unit, image_url, in_stock)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, TRUE)) RETURNING *`,
      [d.category_id || null, d.name, d.description || null, d.price, d.unit || null, d.image_url || null, d.in_stock]
    );
    return rows[0];
  },
  async update(id, d) {
    const { rows } = await query(
      `UPDATE products SET
         category_id = COALESCE($2, category_id), name = COALESCE($3, name),
         description = COALESCE($4, description), price = COALESCE($5, price),
         unit = COALESCE($6, unit), image_url = COALESCE($7, image_url),
         in_stock = COALESCE($8, in_stock)
       WHERE id = $1 RETURNING *`,
      [id, d.category_id ?? null, d.name ?? null, d.description ?? null, d.price ?? null, d.unit ?? null, d.image_url ?? null, d.in_stock ?? null]
    );
    return rows[0];
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

/* ---------------- meals (hot food) ---------------- */
export const meals = {
  async listToday() {
    const { rows } = await query(
      `SELECT * FROM meals WHERE is_available = TRUE AND (available_date = CURRENT_DATE OR (carry_over = TRUE AND available_date < CURRENT_DATE)) ORDER BY created_at DESC`
    );
    return rows;
  },
  async listAll() {
    const { rows } = await query('SELECT * FROM meals ORDER BY available_date DESC, created_at DESC LIMIT 200');
    return rows;
  },
  async create(d) {
    const { rows } = await query(
      `INSERT INTO meals (name, description, price, image_url, available_date, is_available, carry_over)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),COALESCE($6, TRUE),COALESCE($7, FALSE)) RETURNING *`,
      [d.name, d.description || null, d.price, d.image_url || null, d.available_date, d.is_available, d.carry_over]
    );
    return rows[0];
  },
  async update(id, d) {
    const { rows } = await query(
      `UPDATE meals SET
         name = COALESCE($2, name), description = COALESCE($3, description),
         price = COALESCE($4, price), image_url = COALESCE($5, image_url),
         available_date = COALESCE($6, available_date), is_available = COALESCE($7, is_available),
         carry_over = COALESCE($8, carry_over)
       WHERE id = $1 RETURNING *`,
      [id, d.name ?? null, d.description ?? null, d.price ?? null, d.image_url ?? null, d.available_date ?? null, d.is_available ?? null, d.carry_over ?? null]
    );
    return rows[0];
  },
  async remove(id) {
    const { rowCount } = await query('DELETE FROM meals WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

/* ---------------- orders ---------------- */
const orderNo = () => 'DB-' + crypto.randomBytes(3).toString('hex').toUpperCase();

export const orders = {
  // Prices are always read from the database, never trusted from the client.
  async create({ userId, customer, items, fulfillment, paymentMethod, location, deliveryZone }) {
    return tx(async (c) => {
      const priced = [];
      for (const it of items) {
        const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 0));
        if (it.type === 'product') {
          const { rows } = await c.query('SELECT id, name, price, in_stock FROM products WHERE id = $1', [it.id]);
          if (!rows[0] || !rows[0].in_stock) throw Object.assign(new Error(`"${rows[0]?.name || 'An item'}" is out of stock`), { status: 400 });
          priced.push({ type: 'product', id: rows[0].id, name: rows[0].name, price: Number(rows[0].price), qty });
        } else if (it.type === 'meal') {
          const { rows } = await c.query(
            'SELECT id, name, price FROM meals WHERE id = $1 AND is_available = TRUE AND (available_date = CURRENT_DATE OR (carry_over = TRUE AND available_date < CURRENT_DATE))',
            [it.id]
          );
          if (!rows[0]) throw Object.assign(new Error('A meal in your cart is no longer available today'), { status: 400 });
          priced.push({ type: 'meal', id: rows[0].id, name: rows[0].name, price: Number(rows[0].price), qty });
        } else {
          throw Object.assign(new Error('Invalid cart item'), { status: 400 });
        }
      }

      const subtotal = priced.reduce((s, i) => s + i.price * i.qty, 0);
      // Groceries add the constant fee; meals add the fee for the chosen area. A mixed order pays both.
      let deliveryFee = 0;
      if (fulfillment === 'delivery') {
        if (priced.some((i) => i.type === 'product')) deliveryFee += config.store.groceryDeliveryFee;
        if (priced.some((i) => i.type === 'meal')) {
          const zone = config.store.mealZones.find((z) => z.id === deliveryZone);
          if (!zone) throw Object.assign(new Error('Choose your delivery area'), { status: 400 });
          deliveryFee += zone.fee;
        }
      }
      const total = subtotal + deliveryFee;
      const no = orderNo();

      const { rows } = await c.query(
        `INSERT INTO orders (order_no, user_id, customer_name, phone, email, fulfillment, address, note,
                             payment_method, payment_reference, subtotal, delivery_fee, total, delivery_lat, delivery_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          no, userId || null, customer.name, customer.phone, customer.email || null, fulfillment,
          fulfillment === 'delivery' ? customer.address : null, customer.note || null,
          paymentMethod, null, subtotal, deliveryFee, total,
          fulfillment === 'delivery' ? location?.lat ?? null : null, fulfillment === 'delivery' ? location?.lng ?? null : null,
        ]
      );
      const order = rows[0];
      for (const i of priced) {
        await c.query(
          `INSERT INTO order_items (order_id, item_type, item_id, name, unit_price, qty) VALUES ($1,$2,$3,$4,$5,$6)`,
          [order.id, i.type, i.id, i.name, i.price, i.qty]
        );
      }
      return { ...order, items: priced };
    });
  },
  async getByNo(no) {
    const { rows } = await query('SELECT * FROM orders WHERE order_no = $1', [no]);
    if (!rows[0]) return null;
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [rows[0].id]);
    return { ...rows[0], items: items.rows };
  },
  async listForUser(userId) {
    const { rows } = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return rows;
  },
  async listAll({ status } = {}) {
    const { rows } = await query(
      `SELECT o.*, COALESCE(json_agg(json_build_object('name', i.name, 'qty', i.qty, 'unit_price', i.unit_price))
              FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
       ${status ? 'WHERE o.status = $1' : ''}
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200`,
      status ? [status] : []
    );
    return rows;
  },
  async setStatus(id, status) {
    const { rows } = await query('UPDATE orders SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return rows[0];
  },
  async setPaymentRef(orderNo, reference, network) {
    await query(
      `UPDATE orders SET payment_reference = $2, payment_network = $3,
         payment_txn_id = CASE WHEN payment_status = 'failed' THEN NULL ELSE payment_txn_id END,
         payment_sender = CASE WHEN payment_status = 'failed' THEN NULL ELSE payment_sender END,
         payment_status = CASE WHEN payment_status = 'failed' THEN 'pending' ELSE payment_status END
       WHERE order_no = $1`,
      [orderNo, reference, network]
    );
  },
  // Telecel / AirtelTigo: the customer says which transaction paid for the order. Waits for admin confirmation.
  async setManualPayment(orderNo, txnId, sender) {
    await query(
      `UPDATE orders SET payment_txn_id = $2, payment_sender = $3
       WHERE order_no = $1 AND payment_status <> 'paid'`,
      [orderNo, txnId, sender]
    );
  },
  async setPaymentStatus(id, status) {
    const { rows } = await query('UPDATE orders SET payment_status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return rows[0];
  },
  // Atomically claim a one-time email so two requests can never send it twice.
  async claimEmail(id, column) {
    if (!['receipt_sent_at', 'owner_notified_at'].includes(column)) throw new Error('bad column');
    const { rowCount } = await query(`UPDATE orders SET ${column} = NOW() WHERE id = $1 AND ${column} IS NULL`, [id]);
    return rowCount > 0;
  },
  async releaseEmail(id, column) {
    if (!['receipt_sent_at', 'owner_notified_at'].includes(column)) throw new Error('bad column');
    await query(`UPDATE orders SET ${column} = NULL WHERE id = $1`, [id]);
  },
  async getById(id) {
    const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [rows[0].id]);
    return { ...rows[0], items: items.rows };
  },
  async markPaidByNo(orderNo) {
    await query(`UPDATE orders SET payment_status = 'paid' WHERE order_no = $1`, [orderNo]);
  },
  async markFailedByNo(orderNo) {
    await query(`UPDATE orders SET payment_status = 'failed' WHERE order_no = $1 AND payment_status = 'pending'`, [orderNo]);
  },
};

export const stats = {
  // Registered accounts: total, and how many signed up so far this month.
  async users() {
    const { rows } = await query(
      `SELECT COUNT(*) AS total_users,
              COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())) AS signups_month
       FROM users`
    );
    return { total_users: Number(rows[0].total_users), signups_month: Number(rows[0].signups_month) };
  },
  async overview() {
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS orders_today,
         COALESCE(SUM(total) FILTER (WHERE created_at::date = CURRENT_DATE AND status <> 'cancelled'), 0) AS revenue_today,
         COUNT(*) FILTER (WHERE status = 'new') AS new_orders
       FROM orders`
    );
    return rows[0];
  },
};
