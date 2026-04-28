import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port:            parseInt(process.env.PORT || '3000'),
  nodeEnv:         process.env.NODE_ENV || 'development',
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    name:     process.env.DB_NAME     || 'multichannel_messaging',
  },
  redis:           process.env.REDIS_URL || 'redis://localhost:6379',
  meta: {
    appId:       process.env.META_APP_ID       || '',
    appSecret:   process.env.META_APP_SECRET   || '',
    verifyToken: process.env.META_VERIFY_TOKEN || 'my_custom_verify_token_123',
  },
  messenger: {
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
    pageId:          process.env.FB_PAGE_ID           || '',
  },
  instagram: {
    pageAccessToken: process.env.IG_PAGE_ACCESS_TOKEN || '',
    accountId:       process.env.IG_ACCOUNT_ID        || '',
  },
  whatsapp: {
    phoneNumberId:     process.env.WA_PHONE_NUMBER_ID      || '',
    businessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID  || '',
    accessToken:       process.env.WA_ACCESS_TOKEN         || '',
  },
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
};
