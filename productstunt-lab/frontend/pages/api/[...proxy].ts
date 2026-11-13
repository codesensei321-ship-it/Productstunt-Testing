import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { proxy } = req.query;
  const path = Array.isArray(proxy) ? proxy.join('/') : proxy || '';
  const queryString = req.url && req.url.includes('?') ? req.url.split('?')[1] : '';
  const targetUrl = `${BACKEND_URL}/${path}/${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? (req as any) : undefined,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const data = await response.text();
    res.send(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Backend API Unreachable', details: error.message });
  }
}
