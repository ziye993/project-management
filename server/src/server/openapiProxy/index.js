import app from '../../app.js';

app.get('/openapi-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('url query parameter is required');
  }

  try {
    const response = await fetch(url);
    const text = await response.text();
    res.status(response.status).type('application/json').send(text);
  } catch (err) {
    res.status(502).send(err instanceof Error ? err.message : 'proxy fetch failed');
  }
});

app.post('/openapi-api-proxy', async (req, res) => {
  const { url, method = 'GET', cookie, body } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'url must be http or https' });
  }

  const normalizedMethod = String(method).toUpperCase();
  const headers = { Accept: 'application/json, text/plain, */*' };

  if (cookie && typeof cookie === 'string') {
    headers.Cookie = cookie;
  }

  const hasBody = body !== undefined && body !== null && !['GET', 'HEAD'].includes(normalizedMethod);
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method: normalizedMethod,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    res.json({
      status: response.status,
      statusText: response.statusText,
      body: text,
      ok: response.ok,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'proxy fetch failed',
    });
  }
});
