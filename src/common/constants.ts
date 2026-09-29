export const ACCESS_TOKEN_COOKIE = 'rmn_token';
export const ACCOUNT_ID_COOKIE = 'account_id';

export const DATE_FORMAT = {
  MMM_DD_YYYY: 'MMM DD, YYYY',
  YYYY_MM_DD: 'YYYY/MM/DD',
  MM_DD_YYYY: 'MM/DD/YYYY',
  DD_MM_YYYY: 'DD/MM/YYYY',
};

export const defaultConfigs = {
  enableColumnHiding: true,
  client: {
    favicon: '/favicon.ico',
  },
};

export type IAppConfigs = {
  enableColumnHiding?: boolean;
  client?: {
    favicon?: string;
  };
};
