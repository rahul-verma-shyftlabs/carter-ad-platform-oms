import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import environments from '@/common/environments';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `${environments.API_BASE_URL}/media/upload`,
      headers: {
        Authorization: authHeader,
        'Content-Type': req.headers['content-type'] || 'multipart/form-data',
      },
      data: req,
      transformRequest: (value: unknown) => value,
      httpsAgent: new https.Agent({
        rejectUnauthorized: !environments.ALLOW_INSECURE,
      }),
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Media upload failed' });
  }
}
