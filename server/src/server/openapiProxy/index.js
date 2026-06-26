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
