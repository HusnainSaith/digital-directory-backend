import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'digital-directory-media',
  publicUrl: process.env.R2_PUBLIC_URL,
  endpoint: process.env.R2_ENDPOINT,
}));
