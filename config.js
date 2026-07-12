// config.js — Re‑exports from appConfig.js for convenience
import { APP_CONFIG } from './appConfig';
export const CONFIG = {
  CURRENCY: APP_CONFIG.currency,
  PAYMENT_SERVER_URL: APP_CONFIG.paymentServerUrl,
};
