import '@/styles/globals.css';
import React, { useEffect } from 'react';
import Head from 'next/head';
import { Provider as ReduxProvider, useSelector } from 'react-redux';
import { StyledEngineProvider } from '@mui/material/styles';
import { SWRConfig } from 'swr';
import { AppProps } from 'next/app';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { Dialog, Alert, Snackbar, CircularProgress } from '@/lib/material-ui';
import createEmotionCache from '@/common/emotion-cache';
import { useStore } from '@/redux/store';
import { closeDialog, removeAlert } from '@/redux/actions';
import { IRootState } from '@/redux/reducers';
import { NextPageWithLayout } from '@/types/common';
import { UserDataProvider } from '@/contexts/user-data/user-data.hook';
import { AccountDataProvider } from '@/contexts/account/account-data.hook';
import { applyDevSession, consumeOAuthHandoff, setOmsSession } from '@/lib/oms-session';
import { setUser } from '@/redux/actions';

const clientSideEmotionCache = createEmotionCache();

interface Props extends AppProps {
  Component: NextPageWithLayout;
  emotionCache?: EmotionCache;
}

const ShellOverlays: React.FC = () => {
  const { loader, alerts, dialog } = useSelector((state: IRootState) => state.common);

  return (
    <>
      {loader && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          <CircularProgress size={28} />
        </div>
      )}
      {(alerts || []).map(alert => (
        <Snackbar
          key={alert.id}
          open
          autoHideDuration={alert.autoCloseDuration || 4000}
          onClose={() => removeAlert(alert.id || '')}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity={(alert.variant as any) || 'info'} onClose={() => removeAlert(alert.id || '')}>
            {alert.title}
          </Alert>
        </Snackbar>
      ))}
      <Dialog open={Boolean(dialog)} onClose={() => closeDialog()}>
        {dialog ? (
          <div style={{ padding: 24, minWidth: 360 }}>
            <h3 style={{ marginTop: 0 }}>{dialog.title}</h3>
            <p>{dialog.description}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {dialog.rejectButtonProps ? (
                <button
                  type="button"
                  onClick={() => {
                    dialog.rejectButtonProps?.onClick?.();
                    closeDialog();
                  }}
                >
                  {dialog.rejectButtonProps.label || 'Cancel'}
                </button>
              ) : null}
              {dialog.confirmButtonProps ? (
                <button
                  type="button"
                  onClick={() => {
                    dialog.confirmButtonProps?.onClick?.();
                    closeDialog();
                  }}
                >
                  {dialog.confirmButtonProps.label || 'Confirm'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
};

const App = (props: Props) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const getLayout = Component.getLayout || (page => page);
  const store = useStore(pageProps.initialReduxState);

  useEffect(() => {
    applyDevSession();
    const handoff = consumeOAuthHandoff();
    if (handoff) {
      setOmsSession(handoff);
      if (handoff.userId) {
        setUser({ id: handoff.userId });
      }
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <CacheProvider value={emotionCache}>
        <ReduxProvider store={store}>
          <StyledEngineProvider injectFirst>
            <UserDataProvider>
              <AccountDataProvider>
                <SWRConfig value={{ revalidateOnFocus: false }}>
                  {getLayout(<Component {...pageProps} />)}
                  <ShellOverlays />
                </SWRConfig>
              </AccountDataProvider>
            </UserDataProvider>
          </StyledEngineProvider>
        </ReduxProvider>
      </CacheProvider>
    </>
  );
};

export default App;
