import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { mutate } from 'swr';
import { useSelector } from 'react-redux';
import { NextPageWithLayout } from '@/types/common';
import InternalLayout from '@/layouts/internal-layout/internal-layout';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import MondayService from '@/services/crm/monday/monday.service';
import UsersService from '@/services/users/users.service';
import { CRMHttpClient } from '@/services/crm/salesforce/crm-http-client.service';
import ROUTES from '@/common/routes';
import environments from '@/common/environments';
import { IRootState } from '@/redux/reducers';
import { setOmsSession } from '@/lib/oms-session';
import styles from '@/modules/crm/styles/crm.module.scss';

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

const CRMCallbackPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [status, _setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, _setMessage] = useState<string>('Processing authentication...');
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const mondayService = useMemo(() => new MondayService(), []);
  const usersService = useMemo(() => new UsersService(), []);
  
  // Get account_id from Redux state (fallback)
  const reduxUser = useSelector((state: IRootState) => state.common.user);
  const reduxAccountId = reduxUser?.id || reduxUser?.accountId || null;
  
  // Track if callback has been processed to prevent duplicate calls
  const callbackProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate callback processing
    if (callbackProcessedRef.current) {
      return;
    }
    
    const handleCallback = async () => {
      // Mark as processed immediately to prevent duplicate calls
      callbackProcessedRef.current = true;
      
      // Fetch user ID (877) from GraphQL API using RMN_TOKEN cookie
      // This ID will be used as account_id in backend to map all connections
      let userId: string | null = null;
      try {
        const currentUser = await usersService.getCurrentUser();
        // Use user.id (e.g., "877") as the account_id - this is the common key
        userId = currentUser?.id || null;
      } catch {
        userId = reduxAccountId;
      }
      // Get code, state, error, and service from URL query params
      // Handle malformed URLs where Monday.com might add ?code=... after ?service=monday
      const fullUrl = window.location.href;
      const urlSearch = window.location.search;
      
      // Parse query params - handle case where there might be multiple ? in URL
      // Monday.com might create: ?service=monday?code=... instead of ?service=monday&code=...
      let urlParams: URLSearchParams;
      let service: string | null = null;
      
      // Check if URL has malformed query string with multiple ?
      // urlSearch already starts with ?, so we check for multiple ? characters
      const questionMarkCount = (urlSearch.match(/\?/g) || []).length;
      if (questionMarkCount > 1) {
        // Malformed URL: ?service=monday?code=...
        // Extract service from first part and code/state from second part
        const parts = urlSearch.split('?');
        // parts[0] is empty (before first ?), parts[1] has service=monday, parts[2] has code=...
        if (parts[1] && parts[1].includes('service=monday')) {
          service = 'monday';
        }
        // Last part should have code, state, etc. - URLSearchParams can parse without leading ?
        const lastPart = parts[parts.length - 1];
        urlParams = new URLSearchParams(lastPart);
      } else {
        // Normal URL parsing
        urlParams = new URLSearchParams(urlSearch);
        service = urlParams.get('service');
      }
      
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      // If service not detected yet, check sessionStorage (set before OAuth redirect)
      if (!service && typeof window !== 'undefined') {
        const storedService = sessionStorage.getItem('oauth_service');
        if (storedService) {
          service = storedService;
          // Clear it after use
          sessionStorage.removeItem('oauth_service');
        }
      }
      
      // Final fallback: check if the full URL contains service=monday or monday
      if (!service) {
        if (fullUrl.includes('service=monday')) {
          service = 'monday';
        } else if (fullUrl.includes('/monday') || fullUrl.includes('monday.com')) {
          // Only set to monday if we're sure it's not salesforce
          if (!fullUrl.includes('salesforce')) {
            service = 'monday';
          }
        }
      }
      
      // Build full paths with base path
      const basePath = environments.BASE_PATH || '';

      if (service === 'monday') {
        // Handle Monday.com OAuth callback
        const connectPath = `${basePath}${ROUTES.CRM.MONDAY.CONNECT}`;
        const dataPath = `${basePath}${ROUTES.CRM.MONDAY.DATA}`;

        if (error) {
          console.error('Monday.com OAuth error:', error);
          window.history.replaceState({}, '', connectPath);
          router.replace(ROUTES.CRM.MONDAY.CONNECT);
          return;
        }

        if (code) {
          try {
            // Exchange code for connection (no authentication required)
            // Pass userId (877) as account_id to map connection to this user
            const result = await mondayService.exchangeCodeForConnection(code, state || undefined, userId || undefined);
            
            if (result && result.success) {
              // ALWAYS store Monday.com token in localStorage from callback response
              // This is the token needed to fetch Monday.com data
              if (result.monday_token || result.user_id) {
                setOmsSession({
                  mondayToken: result.monday_token,
                  mondayUserId: result.user_id,
                });
              }
              
              // Store user ID (877) as account_id in backend if available
              // This maps all connections (Salesforce, Monday) under this user ID
              if (userId) {
                try {
                  const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
                  await crmHttpClient.httpClient.put('/users/me', { account_id: userId });
                } catch {
                  // Ignore errors
                }
              }
              
              // Invalidate SWR cache to refresh connection status
              await mutate('monday-connection-status');
              // Clean the URL and redirect
              window.history.replaceState({}, '', dataPath);
              router.replace(ROUTES.CRM.MONDAY.DATA);
            } else {
              const errorMsg = result?.message || 'Failed to connect Monday.com';
              throw new Error(errorMsg);
            }
          } catch (err: any) {
            // Try to extract error message from various possible locations
            let errorMessage = 'Failed to connect Monday.com. Please try again.';
            if (err?.response?.data) {
              if (typeof err.response.data === 'string') {
                errorMessage = err.response.data;
              } else if (err.response.data.detail) {
                errorMessage = err.response.data.detail;
              } else if (err.response.data.message) {
                errorMessage = err.response.data.message;
              }
            } else if (err?.message) {
              errorMessage = err.message;
            }
            
            // Store error in sessionStorage to show on connect page
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('monday_connect_error', errorMessage);
            }
            
            window.history.replaceState({}, '', connectPath);
            router.replace(ROUTES.CRM.MONDAY.CONNECT);
          }
        } else {
          window.history.replaceState({}, '', connectPath);
          router.replace(ROUTES.CRM.MONDAY.CONNECT);
        }
      } else {
        // Default to Salesforce for backward compatibility
        // Handle Salesforce OAuth callback (existing logic)
        const connectPath = `${basePath}${ROUTES.CRM.SALESFORCE.CONNECT}`;
        const dataPath = `${basePath}${ROUTES.CRM.SALESFORCE.DATA}`;

        if (error) {
          console.error('Salesforce OAuth error:', error);
          window.history.replaceState({}, '', connectPath);
          router.replace(ROUTES.CRM.SALESFORCE.CONNECT);
          return;
        }

        if (code && state) {
          try {
            // Pass userId (877) as account_id to map connection to this user
            const tokenData = await salesforceService.exchangeCodeForToken(code, state, userId || undefined);
            
            if (tokenData.access_token) {
              setOmsSession({
                crmBackendToken: tokenData.access_token,
                salesforceToken: tokenData.salesforce_token,
                userId: userId || undefined,
              });
              
              // Store user ID (877) as account_id in backend if available
              // This maps all connections (Salesforce, Monday) under this user ID
              if (userId) {
                try {
                  const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
                  await crmHttpClient.httpClient.put('/users/me', { account_id: userId });
                } catch {
                  // Ignore errors
                }
              }
              
              // Invalidate SWR cache to refresh connection status
              await mutate('salesforce-connection-status');
              window.history.replaceState({}, '', dataPath);
              router.replace(ROUTES.CRM.SALESFORCE.DATA);
            } else {
              throw new Error('No access token received from backend');
            }
          } catch {
            window.history.replaceState({}, '', connectPath);
            router.replace(ROUTES.CRM.SALESFORCE.CONNECT);
          }
        } else {
          window.history.replaceState({}, '', connectPath);
          router.replace(ROUTES.CRM.SALESFORCE.CONNECT);
        }
      }
    };

    handleCallback();
  }, []); // Only run once on mount

  return (
    <div className={styles.connector_container}>
      <div className={styles.connector_content} style={{ alignItems: 'center', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="spin" color={carterColors['brand-600']} />
            <div style={{ marginTop: '24px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
              {message}
            </Typography>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={48} color={carterColors['green-700']} />
            <div style={{ marginTop: '24px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
              {message}
            </Typography>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={48} color={carterColors['red-700']} />
            <div style={{ marginTop: '24px' }}>
              <Typography variant="h3-semibold" color={carterColors['text-900']}>
              {message}
            </Typography>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Typography variant="body-regular" color={carterColors['text-600']}>
              Redirecting to connection page...
            </Typography>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

CRMCallbackPage.getLayout = page => {
  return <InternalLayout head={{ title: 'CRM Callback' }}>{page}</InternalLayout>;
};

export default CRMCallbackPage;
