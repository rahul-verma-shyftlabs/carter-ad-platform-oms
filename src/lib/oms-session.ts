export const OMS_EMBED_READY = 'oms:embed:ready';
export const OMS_EMBED_TOKEN = 'oms:embed:token';
export const OMS_EMBED_RELOAD = 'oms:embed:reload-request';
export const OMS_EMBED_NAVIGATE = 'oms:embed:navigate';
export const OMS_EMBED_ROUTE = 'oms:embed:route';
export const OMS_OAUTH_COMPLETE = 'oms:oauth:complete';

export type OmsSession = {
  rmnToken?: string;
  userId?: string;
  crmBackendToken?: string;
  salesforceToken?: string;
  mondayToken?: string;
  mondayUserId?: string;
};

export type ParentToOmsMessage =
  | {
      type: typeof OMS_EMBED_TOKEN;
      v: number;
      token: string;
      userId: string;
      crmBackendToken?: string;
    }
  | {
      type: typeof OMS_EMBED_ROUTE;
      v: number;
      path: string;
    };

export type OmsToParentMessage =
  | { type: typeof OMS_EMBED_READY; v?: number }
  | { type: typeof OMS_EMBED_RELOAD; v?: number; reason?: string }
  | { type: typeof OMS_EMBED_NAVIGATE; v?: number; path: string };

const OAUTH_HANDOFF_KEY = 'oms_oauth_handoff';

let session: OmsSession = {};
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(listener => listener());
};

export const getOmsSession = (): OmsSession => session;

export const setOmsSession = (patch: Partial<OmsSession>): OmsSession => {
  session = { ...session, ...patch };
  notify();
  return session;
};

export const clearOmsSession = (): void => {
  session = {};
  notify();
};

export const subscribeOmsSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const isEmbedded = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.parent !== window;
};

export const getAllowedParentOrigins = (): string[] => {
  const raw = process.env.NEXT_PUBLIC_PARENT_ORIGIN || '';
  return raw
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
};

export const isAllowedParentOrigin = (origin: string): boolean => {
  const allowed = getAllowedParentOrigins();
  if (allowed.length === 0) {
    return process.env.NODE_ENV !== 'production';
  }
  return allowed.includes(origin);
};

export const writeOAuthHandoff = (payload: Partial<OmsSession>): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(OAUTH_HANDOFF_KEY, JSON.stringify(payload));
};

export const consumeOAuthHandoff = (): Partial<OmsSession> | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(OAUTH_HANDOFF_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(OAUTH_HANDOFF_KEY);
  try {
    return JSON.parse(raw) as Partial<OmsSession>;
  } catch {
    return null;
  }
};

export const applyDevSession = (): void => {
  const userId = process.env.NEXT_PUBLIC_OMS_DEV_USER_ID || process.env.OMS_DEV_USER_ID;
  const rmnToken = process.env.NEXT_PUBLIC_OMS_DEV_RMN_TOKEN || process.env.OMS_DEV_RMN_TOKEN;
  const crmBackendToken = process.env.NEXT_PUBLIC_OMS_DEV_CRM_BACKEND_TOKEN || process.env.OMS_DEV_CRM_BACKEND_TOKEN;
  if (!userId && !rmnToken && !crmBackendToken) return;
  setOmsSession({
    userId: userId || session.userId,
    rmnToken: rmnToken || session.rmnToken,
    crmBackendToken: crmBackendToken || session.crmBackendToken,
  });
};
