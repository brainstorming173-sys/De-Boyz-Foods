import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool } from './db.js';

const { ADMIN_NAME = 'De-Boyz Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified)
     VALUES ($1, LOWER($2), $3, 'admin', TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [ADMIN_NAME, ADMIN_EMAIL, hash]
  );

  const cats = ['Dairy & Eggs', 'Pantry', 'Produce', 'Staples'];
  for (const name of cats) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
      [name, slug]
    );
  }
  const { rows: [{ n }] } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (n === 0) {
    const sample = [
      ['staples', 'Rice 5kg', 'Long grain parboiled rice', 80, 'per bag'],
      ['pantry', 'Cooking Oil 1L', 'Vegetable cooking oil', 35, 'per bottle'],
      ['produce', 'Onions', 'Fresh red onions', 15, 'per bag'],
      ['dairy-eggs', 'Eggs (crate)', 'Farm fresh eggs, 30 per crate', 30, 'per pack'],
      ['produce', 'Plantain', 'Ripe plantain bunch', 25, 'per bag'],
    ];
    for (const [slug, name, description, price, unit] of sample) {
      await pool.query(
        `INSERT INTO products (category_id, name, description, price, unit)
         VALUES ((SELECT id FROM categories WHERE slug = $1), $2, $3, $4, $5)`,
        [slug, name, description, price, unit]
      );
    }
  }
  console.log(`Seeded admin ${ADMIN_EMAIL} and ${cats.length} categories (${config.env}).`);
} catch (e) {
  console.error('Seed failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
