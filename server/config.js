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
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'De-Boyz Foods <onboarding@resend.dev>',
  // Who gets the "New order" email. Comma-separated. Falls back to the admin login email.
  orderNotifyEmails: (process.env.ORDER_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim()).filter(Boolean),
  // MTN MoMo, Telecel Cash and AirtelTigo Money: the customer sends the money to one of these
  // numbers, then submits the transaction ID. An admin confirms it in the dashboard.
  // Override with MANUAL_PAY_NUMBERS=0538927692,0201753511
  manualPay: {
    numbers: (process.env.MANUAL_PAY_NUMBERS || '0538927692,0201753511').split(',').map((n) => n.trim()).filter(Boolean),
  },
  store: {
    // Meals: the fee depends on the delivery area the customer picks. Groceries: one constant fee.
    mealZones: [
      { id: 'j1-5', label: 'Junction 1 to 5', fee: 5 },
      { id: 'j6', label: 'Junction 6 and environs', fee: 8 },
      { id: 'other', label: 'Any other location', fee: 15 },
    ],
    groceryDeliveryFee: 20,
    defaultArea: process.env.DEFAULT_DELIVERY_AREA || 'Koforidua',
  },
};

if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
