import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import logger from '@/common/logger';
import { showLoader } from '@/redux/actions';
import { getOmsSession, isEmbedded, OMS_EMBED_RELOAD, getAllowedParentOrigins } from '@/lib/oms-session';

type CRMHttpClientConfig = {
  baseUrl?: string;
  rawResponse?: boolean;
};

const requestSessionRefresh = () => {
  if (typeof window === 'undefined' || !isEmbedded()) return;
  getAllowedParentOrigins().forEach(origin => {
    window.parent.postMessage({ type: OMS_EMBED_RELOAD, v: 1, reason: '401' }, origin);
  });
};

export class CRMHttpClient {
  private axios: AxiosInstance;

  constructor(configs: CRMHttpClientConfig = {}) {
    const { baseUrl } = configs;
    this.axios = axios.create({
      baseURL: baseUrl || process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1',
    });

    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (!(config as any).silent) {
          showLoader(true);
        }

        const session = getOmsSession();
        const token = session.crmBackendToken;
        const userId = session.userId;

        if (!config.headers?.Authorization && token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          } as any;
        }

        if (userId) {
          if (config.params === undefined) {
            config.params = { user_id: userId };
          } else {
            config.params.user_id = userId;
          }
          if (!config.headers?.['X-User-Id']) {
            config.headers = {
              ...config.headers,
              'X-User-Id': userId,
            } as any;
          }
        }

        return config;
      },
      (error: AxiosError) => {
        showLoader(false);
        logger.error(error);
        return Promise.reject(error.request);
      },
    );

    this.axios.interceptors.response.use(
      response => {
        showLoader(false);
        return response;
      },
      (error: AxiosError) => {
        showLoader(false);
        if (error.response?.status === 401) {
          requestSessionRefresh();
        }
        return Promise.reject(error.response);
      },
    );
  }

  get httpClient() {
    return this.axios;
  }
}
