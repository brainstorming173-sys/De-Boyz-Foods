import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.resendKey ? new Resend(config.resendKey) : null;

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`\n[email:dev] to=${to}\nsubject=${subject}\n${html.replace(/<[^>]+>/g, ' ')}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: config.emailFrom, to, subject, html });
  if (error) console.error('Resend error:', error);
}

const wrapHtml = (body) =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b1b1b">
     <h2 style="color:#0b6b2e;margin:0 0 16px">De-Boyz Foods</h2>${body}</div>`;

export const sendVerificationEmail = (to, name, token) => {
  const link = `${config.clientOrigin}/verify-email?token=${token}`;
  return send({
    to,
    subject: 'Verify your email',
    html: wrapHtml(`<p>Hi ${name},</p><p>Confirm your email to finish setting up your account.</p>
      <p><a href="${link}" style="background:#0b6b2e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Verify email</a></p>`),
  });
};

export const sendPasswordResetEmail = (to, name, token) => {
  const link = `${config.clientOrigin}/reset-password?token=${token}`;
  return send({
    to,
    subject: 'Reset your password',
    html: wrapHtml(`<p>Hi ${name},</p><p>Use this link to choose a new password. It expires in 1 hour.</p>
      <p><a href="${link}" style="background:#0b6b2e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Reset password</a></p>
      <p>If you didn't ask for this, you can ignore this email.</p>`),
  });
};
