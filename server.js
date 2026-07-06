const path = require('node:path');
const express = require('express');

try {
  process.loadEnvFile();
} catch {
  // no .env file — rely on environment variables
}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Copy .env.example to .env and add your key.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Liveness/readiness probe target for Kubernetes — must be cheap and
// must not depend on the Gemini API being up.
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.text ?? '') }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a helpful, friendly assistant. Keep answers clear and concise.' }],
        },
        contents,
      }),
    });
  } catch {
    return res.status(502).json({ error: 'Could not reach the Gemini API' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error(`Gemini API error ${upstream.status}: ${detail.slice(0, 500)}`);
    return res.status(502).json({ error: `Gemini API returned ${upstream.status}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Re-emit the upstream SSE stream as simple { text } delta events.
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newlineAt;
      while ((newlineAt = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineAt).trim();
        buffer = buffer.slice(newlineAt + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        const text = (parsed.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? '')
          .join('');
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('data: {"done":true}\n\n');
  } catch {
    res.write('data: {"error":"Stream interrupted"}\n\n');
  }
  res.end();
});

app.listen(PORT, () => {
  console.log(`Chat app running at http://localhost:${PORT} (model: ${MODEL})`);
});
