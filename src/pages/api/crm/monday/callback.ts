import { NextApiRequest, NextApiResponse } from 'next';
import UsersService from '@/services/users/users.service';
import environments from '@/common/environments';

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_BASE_URL || 'https://temp-crm.trycarter.com/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  // Determine frontend base URL for backend to redirect back to
  const basePath = environments.BASE_PATH || '';
  const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || (req.headers.host ? `${protocol}://${req.headers.host}` : 'http://localhost:3000');
  
  // Handle OAuth errors - redirect to backend which will then redirect to frontend
  if (error) {
    const errorParam = encodeURIComponent(error as string);
    const redirectUri = encodeURIComponent(`${frontendBaseUrl}${basePath}/crm/monday/connect`);
    const backendRedirectUrl = `${CRM_API_BASE_URL}/auth/monday/callback?error=${errorParam}&redirect_uri=${redirectUri}`;
    return res.redirect(backendRedirectUrl);
  }

  if (!code) {
    const errorParam = encodeURIComponent('No authorization code received');
    const redirectUri = encodeURIComponent(`${frontendBaseUrl}${basePath}/crm/monday/connect`);
    const backendRedirectUrl = `${CRM_API_BASE_URL}/auth/monday/callback?error=${errorParam}&redirect_uri=${redirectUri}`;
    return res.redirect(backendRedirectUrl);
  }

  try {
    // Get user ID from GraphQL API using RMN_TOKEN cookie (optional - backend can also find by email)
    let userId: string | null = null;
    try {
      const usersService = new UsersService();
      const currentUser = await usersService.getCurrentUser();
      userId = currentUser?.id || null;
    } catch (err) {
      console.error('Failed to get current user:', err);
      // Continue without userId - backend will find/create user by email
    }

    // Build backend callback URL with OAuth params and frontend redirect URI
    const frontendRedirectUri = `${frontendBaseUrl}${basePath}/crm/monday/data`;
    const backendCallbackUrl = new URL(`${CRM_API_BASE_URL}/auth/monday/callback`);
    backendCallbackUrl.searchParams.set('code', code as string);
    if (state) {
      backendCallbackUrl.searchParams.set('state', state as string);
    }
    if (userId) {
      backendCallbackUrl.searchParams.set('account_id', userId);
    }
    backendCallbackUrl.searchParams.set('redirect_uri', frontendRedirectUri);

    // Redirect to FastAPI backend - it will process the OAuth callback and redirect back to frontend
    return res.redirect(backendCallbackUrl.toString());
  } catch (err: any) {
    console.error('Monday.com OAuth callback error:', err);
    
    // Extract error message
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

    // Redirect to backend with error, which will redirect to frontend
    const errorParam = encodeURIComponent(errorMessage);
    const redirectUri = encodeURIComponent(`${frontendBaseUrl}${basePath}/crm/monday/connect`);
    const backendRedirectUrl = `${CRM_API_BASE_URL}/auth/monday/callback?error=${errorParam}&redirect_uri=${redirectUri}`;
    return res.redirect(backendRedirectUrl);
  }
}

