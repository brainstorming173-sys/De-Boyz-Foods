import 'dotenv/config';

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  clientOrigin,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'De-Boyz Foods <onboarding@resend.dev>',
  // Direct MTN MoMo Collections API ("Request to Pay").
  // MOMO_ENV: mock (local dev, no real prompt) | sandbox (MTN test) | production (live)
  momo: (() => {
    const env = process.env.MOMO_ENV || (process.env.NODE_ENV === 'production' ? 'sandbox' : 'mock');
    const live = env === 'production';
    return {
      env,
      baseUrl: process.env.MOMO_BASE_URL || (live ? 'https://proxy.momoapi.mtn.com' : 'https://sandbox.momodeveloper.mtn.com'),
      targetEnv: live ? process.env.MOMO_TARGET_ENV || 'mtnghana' : 'sandbox',
      currency: live ? 'GHS' : 'EUR', // MTN's sandbox only accepts EUR
      subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
      apiUser: process.env.MOMO_API_USER,
      apiKey: process.env.MOMO_API_KEY,
      callbackUrl: process.env.MOMO_CALLBACK_URL,
    };
  })(),
  // Telecel Cash + AirtelTigo Money: the customer sends the money to one of these numbers,
  // then submits the transaction ID. An admin confirms it in the dashboard (MTN stays automatic).
  // Override with MANUAL_PAY_NUMBERS=0538927692,0201753511
  manualPay: {
    numbers: (process.env.MANUAL_PAY_NUMBERS || '0538927692,0201753511').split(',').map((n) => n.trim()).filter(Boolean),
  },
  store: {
    freeDeliveryThreshold: num(process.env.FREE_DELIVERY_THRESHOLD, 200),
    deliveryFee: num(process.env.DELIVERY_FEE, 15),
    defaultArea: process.env.DEFAULT_DELIVERY_AREA || 'Koforidua',
  },
};

if (config.isProd && config.momo.env === 'mock') {
  throw new Error('MOMO_ENV=mock cannot be used in production');
}
if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
