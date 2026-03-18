import { registerAs } from '@nestjs/config';

export default registerAs('mailer', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  fromName: process.env.SMTP_FROM_NAME || 'Digital Directory',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@yourdirectory.com',
}));
