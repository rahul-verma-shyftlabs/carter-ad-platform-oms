import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import environments from '@/common/environments';
import logger from '@/common/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!environments.API_BASE_URL) {
    logger.error('GraphQL proxy missing NEXT_PUBLIC_API_BASE_URL');
    return res.status(500).json({ error: 'OMS API base URL is not configured' });
  }

  try {
    const response = await axios.post(`${environments.API_BASE_URL}/graphql`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: !environments.ALLOW_INSECURE,
      }),
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    logger.error('GraphQL proxy failed', {
      status,
      apiBaseUrl: environments.API_BASE_URL,
      message: error.message,
    });
    return res.status(status).json(error.response?.data || { error: 'GraphQL proxy failed' });
  }
}
