import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../config.js';
import { pool } from './db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('Schema applied.');
} catch (e) {
  console.error('Schema failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
