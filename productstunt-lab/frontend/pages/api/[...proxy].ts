import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { proxy } = req.query;
  const path = Array.isArray(proxy) ? proxy.join('/') : proxy || '';
  const queryString = req.url && req.url.includes('?') ? req.url.split('?')[1] : '';
  const targetUrl = `${BACKEND_URL}/${path}/${queryString ? `?${queryString}` : ''}`;

  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const rawBody = hasBody ? await readRawBody(req) : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: hasBody && rawBody && rawBody.length > 0 ? new Uint8Array(rawBody) : undefined,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'content-encoding' && lower !== 'transfer-encoding' && lower !== 'content-length') {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    res.send(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Backend API Unreachable', details: error.message });
  }
}
