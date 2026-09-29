export type ENVIRONMENT = {
  API_BASE_URL: string;
  APP_BASE_URL: string;
  BASE_PATH: string;
  CRM_API_BASE_URL: string;
  PARENT_ORIGIN: string;
  APP_ENV?: string;
  ALLOW_INSECURE?: boolean;
  DEV_USER_ID?: string;
  DEV_RMN_TOKEN?: string;
  DEV_CRM_BACKEND_TOKEN?: string;
};

const environments: ENVIRONMENT = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL || '',
  BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
  CRM_API_BASE_URL: process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1',
  PARENT_ORIGIN: process.env.NEXT_PUBLIC_PARENT_ORIGIN || '',
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || '',
  ALLOW_INSECURE: process.env.NEXT_PUBLIC_ALLOW_INSECURE === 'true',
  DEV_USER_ID: process.env.OMS_DEV_USER_ID || process.env.NEXT_PUBLIC_OMS_DEV_USER_ID || '',
  DEV_RMN_TOKEN: process.env.OMS_DEV_RMN_TOKEN || process.env.NEXT_PUBLIC_OMS_DEV_RMN_TOKEN || '',
  DEV_CRM_BACKEND_TOKEN: process.env.OMS_DEV_CRM_BACKEND_TOKEN || process.env.NEXT_PUBLIC_OMS_DEV_CRM_BACKEND_TOKEN || '',
};

export default environments;
