import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { users, sha256 } from '../db/store.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const r = Router();
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '');

r.post('/register', wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name?.trim()) throw bad('Enter your name');
  if (!emailOk(email)) throw bad('Enter a valid email');
  if (!password || password.length < 8) throw bad('Password must be at least 8 characters');

  const token = crypto.randomBytes(32).toString('hex');
  const user = await users.create({
    name: name.trim(), email, phone,
    passwordHash: await bcrypt.hash(password, 12),
    verifyTokenHash: sha256(token),
  });
  sendVerificationEmail(user.email, user.name, token).catch(console.error);
  res.status(201).json({ token: signToken(user), user });
}));

r.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const row = email ? await users.findByEmail(email) : null;
  if (!row || !(await bcrypt.compare(password || '', row.password_hash))) {
    throw bad('Wrong email or password', 401);
  }
  const { password_hash, verify_token_hash, reset_token_hash, reset_expires_at, ...user } = row;
  res.json({ token: signToken(user), user });
}));

r.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await users.findById(req.user.id);
  if (!user) throw bad('Account not found', 401);
  res.json({ user });
}));

r.post('/verify-email', wrap(async (req, res) => {
  const user = req.body.token ? await users.verifyEmail(sha256(req.body.token)) : null;
  if (!user) throw bad('This verification link is invalid or already used');
  res.json({ user });
}));

// Always responds 200 so the endpoint can't be used to discover which emails have accounts.
r.post('/forgot-password', wrap(async (req, res) => {
  const row = emailOk(req.body.email) ? await users.findByEmail(req.body.email) : null;
  if (row) {
    const token = crypto.randomBytes(32).toString('hex');
    await users.setResetToken(row.id, sha256(token), new Date(Date.now() + 60 * 60 * 1000));
    sendPasswordResetEmail(row.email, row.name, token).catch(console.error);
  }
  res.json({ ok: true });
}));

r.post('/reset-password', wrap(async (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 8) throw bad('Password must be at least 8 characters');
  const user = token ? await users.resetPassword(sha256(token), await bcrypt.hash(password, 12)) : null;
  if (!user) throw bad('This reset link is invalid or has expired');
  res.json({ ok: true });
}));

export default r;
