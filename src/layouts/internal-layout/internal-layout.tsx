import React, { PropsWithChildren, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  getAllowedParentOrigins,
  isAllowedParentOrigin,
  isEmbedded,
  OMS_EMBED_NAVIGATE,
  OMS_EMBED_READY,
  OMS_EMBED_ROUTE,
  OMS_EMBED_TOKEN,
  OMS_OAUTH_COMPLETE,
  ParentToOmsMessage,
  setOmsSession,
} from '@/lib/oms-session';
import { setUser } from '@/redux/actions';
import UsersService from '@/services/users/users.service';
import styles from './oms-layout.module.scss';

const notifyParentOfRoute = (path: string) => {
  if (!isEmbedded()) return;
  const origins = getAllowedParentOrigins();
  origins.forEach(origin => {
    window.parent.postMessage({ type: OMS_EMBED_NAVIGATE, v: 1, path }, origin);
  });
};

const OmsLayout: React.FC<PropsWithChildren<{ head?: { title?: string } }>> = ({ children, head }) => {
  const router = useRouter();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isAllowedParentOrigin(event.origin) && event.source !== window.opener) {
        return;
      }
      const data = event.data as ParentToOmsMessage | { type?: string; salesforceToken?: string; mondayToken?: string; userId?: string; crmBackendToken?: string };
      if (!data || typeof data !== 'object') return;

      if (data.type === OMS_EMBED_TOKEN) {
        const tokenMessage = data as Extract<ParentToOmsMessage, { type: typeof OMS_EMBED_TOKEN }>;
        setOmsSession({
          rmnToken: tokenMessage.token,
          userId: tokenMessage.userId,
          crmBackendToken: tokenMessage.crmBackendToken,
        });
        if (tokenMessage.userId) {
          setUser({ id: tokenMessage.userId });
        }
        if (tokenMessage.token) {
          const usersService = new UsersService();
          usersService.getCurrentUser().then(user => setUser(user)).catch(() => undefined);
        }
        return;
      }

      if (data.type === OMS_EMBED_ROUTE) {
        const routeMessage = data as Extract<ParentToOmsMessage, { type: typeof OMS_EMBED_ROUTE }>;
        if (routeMessage.path && routeMessage.path !== router.asPath) {
          void router.replace(routeMessage.path, undefined, { shallow: true });
        }
        return;
      }

      if (data.type === OMS_OAUTH_COMPLETE) {
        setOmsSession({
          salesforceToken: (data as any).salesforceToken,
          mondayToken: (data as any).mondayToken,
          mondayUserId: (data as any).mondayUserId,
          userId: (data as any).userId || undefined,
          crmBackendToken: (data as any).crmBackendToken,
        });
      }
    };

    window.addEventListener('message', onMessage);
    if (isEmbedded()) {
      const origins = getAllowedParentOrigins();
      if (origins.length === 0) {
        window.parent.postMessage({ type: OMS_EMBED_READY, v: 1 }, '*');
      } else {
        origins.forEach(origin => {
          window.parent.postMessage({ type: OMS_EMBED_READY, v: 1 }, origin);
        });
      }
    }
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    notifyParentOfRoute(router.asPath);
  }, [router.asPath, router.isReady]);

  return (
    <>
      <Head>
        <title>{head?.title ? `${head.title} | Core OMS` : 'Core OMS'}</title>
      </Head>
      <div className={styles.shell} data-embedded={isEmbedded()}>
        {children}
      </div>
    </>
  );
};

export default OmsLayout;
