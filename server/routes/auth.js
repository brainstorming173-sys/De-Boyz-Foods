import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { users, sha256 } from '../db/store.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { config } from '../config.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const r = Router();
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '');
const phoneOk = (p) => /^[0-9+\s-]{9,15}$/.test(p || '');

r.post('/register', wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name?.trim()) throw bad('Enter your name');
  if (!emailOk(email)) throw bad('Enter a valid email');
  if (!phoneOk(phone)) throw bad('Enter a valid mobile number');
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
  if (row && !row.password_hash) throw bad('This account uses Google. Tap "Continue with Google" to sign in.', 401);
  if (!row || !(await bcrypt.compare(password || '', row.password_hash))) {
    throw bad('Wrong email or password', 401);
  }
  const { password_hash, verify_token_hash, reset_token_hash, reset_expires_at, google_id, ...user } = row;
  res.json({ token: signToken(user), user });
}));

// The browser asks which Google client to use, so the client ID is set once on the server only.
r.get('/google-config', (_req, res) => res.json({ clientId: config.googleClientId || null }));

// Google sign-in / sign-up. The browser sends the ID token Google gave it; we verify it with Google.
r.post('/google', wrap(async (req, res) => {
  if (!config.googleClientId) throw bad('Google sign-in is not set up yet', 503);
  const credential = String(req.body.credential || '');
  if (!credential) throw bad('Google sign-in failed. Please try again');

  let info;
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!resp.ok) throw new Error('rejected');
    info = await resp.json();
  } catch {
    throw bad('Google sign-in failed. Please try again', 401);
  }
  const issuerOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== config.googleClientId || !issuerOk || Number(info.exp) * 1000 < Date.now()) {
    throw bad('Google sign-in failed. Please try again', 401);
  }
  if (String(info.email_verified) !== 'true' || !emailOk(info.email)) {
    throw bad('Your Google email is not verified', 401);
  }

  let user = await users.findByGoogleId(info.sub);
  let created = false;
  if (!user) {
    const existing = await users.findByEmail(info.email);
    if (existing) {
      user = await users.linkGoogle(existing.id, info.sub);
    } else {
      user = await users.createFromGoogle({ name: (info.name || info.email.split('@')[0]).trim(), email: info.email, googleId: info.sub });
      created = true;
    }
  }
  res.status(created ? 201 : 200).json({ token: signToken(user), user });
}));

// Mobile number for accounts that don't have one yet (Google sign-ups, older accounts).
r.patch('/phone', requireAuth, wrap(async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phoneOk(phone)) throw bad('Enter a valid mobile number');
  const user = await users.setPhone(req.user.id, phone);
  if (!user) throw bad('Account not found', 401);
  res.json({ user });
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
