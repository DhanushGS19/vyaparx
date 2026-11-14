import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'vyaparx-super-secure-production-jwt-token-key-2026',
  jwtExpiresIn: '7d',
  gstRates: [0, 5, 12, 18, 28],
  defaultGstRate: 18,
  companyName: 'VyaparX Network Technologies India',
  emailConfigured: !!process.env.SMTP_HOST,
  whatsappConfigured: !!process.env.WHATSAPP_API_KEY,
};

export default config;

