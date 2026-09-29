import { NextApiRequest, NextApiResponse } from 'next';
import { sendOAuthHandoffPage } from '@/lib/oauth-handoff';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const success = req.body.success === 'true' || req.body.success === true;
  const monday_token = req.body.monday_token;
  const user_id = req.body.user_id;
  const error = req.body.error;
  const redirect_url = req.body.redirect_url || '/crm/monday/data';
  const access_token = req.body.access_token || req.body.crm_backend_token;

  if (success && monday_token) {
    return sendOAuthHandoffPage(res, {
      success: true,
      mondayToken: monday_token,
      mondayUserId: user_id,
      userId: user_id,
      crmBackendToken: access_token,
      redirectUrl: redirect_url,
    });
  }

  return sendOAuthHandoffPage(res, {
    success: false,
    error: error || 'Monday.com connection failed',
    redirectUrl: redirect_url || '/crm/monday/connect',
  });
}
