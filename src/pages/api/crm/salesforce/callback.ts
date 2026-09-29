import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { ACCESS_TOKEN_COOKIE } from '@/common/constants';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { CRMHttpClient } from '@/services/crm/salesforce/crm-http-client.service';
import environments from '@/common/environments';

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  // Handle OAuth errors
  const basePath = environments.BASE_PATH || '';
  const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || (req.headers.host ? `${protocol}://${req.headers.host}` : 'http://localhost:3000');
  
  if (error) {
    const redirectUrl = `${baseUrl}${basePath}/crm/salesforce/connect?error=${encodeURIComponent(error as string)}`;
    return res.redirect(redirectUrl);
  }

  if (!code || !state) {
    const redirectUrl = `${baseUrl}${basePath}/crm/salesforce/connect?error=No authorization code or state received`;
    return res.redirect(redirectUrl);
  }

  try {
    // Get user ID (877) dynamically - always fetch `id` from GraphQL API
    let userId: string | null = null;
    
    try {
      // Call GraphQL API directly using token from cookies
      const token = req.cookies[ACCESS_TOKEN_COOKIE];
      if (!token) {
        // No access token found in cookies - cannot fetch user from GraphQL
      } else {
        const graphqlQuery = {
          query: `
            query UserByToken {
              userByToken {
                id
                accountId
                name
                email
              }
            }
          `
        };
        
        // Call the GraphQL endpoint directly (not through /api/graphql proxy)
        const graphqlEndpoint = `${environments.API_BASE_URL}/graphql`;
        
        const graphqlResponse = await axios.post(
          graphqlEndpoint,
          graphqlQuery,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        const currentUser = graphqlResponse.data?.data?.userByToken;
        
        // Extract the `id` field from userByToken response (e.g., "877")
        userId = currentUser?.id || null;
        
        if (userId) {
          // userId is kept in memory by the client session handshake
        }
      }
    } catch (err: any) {
      console.error('Failed to get current user from GraphQL API (userByToken):', err?.response?.data || err?.message || err);
      if (err?.response?.data) {
        console.error('GraphQL error details:', JSON.stringify(err.response.data, null, 2));
      }
    }
    
    // Exchange code for token - pass user ID (877) so backend can save connection under this user
    // Ensure we only pass a valid string or undefined (never null or object)
    const accountIdForBackend: string | undefined = (userId && typeof userId === 'string' && userId.trim() !== '') 
      ? userId.trim() 
      : undefined;
    
    const salesforceService = new SalesforceService();
    const tokenData = await salesforceService.exchangeCodeForToken(
      code as string,
      state as string,
      accountIdForBackend  // Pass user ID (877) dynamically - backend will save connection under this user
    );

    if (tokenData.access_token) {
      // No auth token needed - backend uses user_id query param
      if (userId && tokenData.user?.id) {
        try {
          const crmHttpClient = new CRMHttpClient({ baseUrl: CRM_API_BASE_URL });
          await crmHttpClient.httpClient.put(`/users/me?user_id=${tokenData.user.id}`, { account_id: userId });
        } catch (err) {
          console.error('Failed to update user account_id:', err);
        }
      }

      // Redirect to data view
      const redirectUrl = `${baseUrl}${basePath}/crm/salesforce/data`;
      return res.redirect(redirectUrl);
    } else {
      const redirectUrl = `${baseUrl}${basePath}/crm/salesforce/connect?error=No access token received from backend`;
      return res.redirect(redirectUrl);
    }
  } catch (err: any) {
    console.error('Salesforce OAuth callback error:', err);
    
    // Extract error message
    let errorMessage = 'Failed to connect Salesforce. Please try again.';
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

    const redirectUrl = `${baseUrl}${basePath}/crm/salesforce/connect?error=${encodeURIComponent(errorMessage)}`;
    return res.redirect(redirectUrl);
  }
}
