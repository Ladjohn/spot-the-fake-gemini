import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// In-memory leaderboard
let leaderboard: { name: string; score: number }[] = [];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            const url = req.url?.split('?')[0];

            // ── /api/openrouter ─────────────────────────────────
            if (url === '/api/openrouter' && req.method === 'POST') {
              const OR_KEY = process.env.OPENROUTER_API_KEY;
              if (!OR_KEY) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }));
                return;
              }

              const body = await readBody(req);
              const { messages, temperature = 0.7, max_tokens = 1200 } = body;

              const fetchWithTimeout = async (model: string) => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                try {
                  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${OR_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ model, messages, temperature, max_tokens }),
                    signal: controller.signal,
                  });
                  return r.json();
                } finally {
                  clearTimeout(timer);
                }
              };

              try {
                let data = await fetchWithTimeout('mistralai/mistral-7b-instruct:free');
                if (!data?.choices?.[0]?.message?.content) {
                  data = await fetchWithTimeout('mistralai/mistral-7b-instruct:free');
                }
                if (data?.choices?.[0]?.message?.content) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                  return;
                }
              } catch (err) {
                console.error('[api/openrouter] error:', err);
              }

              // Fallback
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                choices: [{ message: { content: JSON.stringify([
                  {
                    headline: 'The Eiffel Tower is located in Paris',
                    type: 'REAL',
                    category: 'Culture',
                    difficulty: 'Easy',
                    explanation: 'Correct answer: REAL. Fact check: The Eiffel Tower is a landmark in Paris, France.',
                    imagePrompt: 'Eiffel Tower Paris landmark',
                  },
                  {
                    headline: 'The Pacific Ocean is smaller than the Mediterranean Sea',
                    type: 'FAKE',
                    category: 'Science',
                    difficulty: 'Easy',
                    explanation: 'Correct answer: FAKE. Fact check: The Pacific Ocean is the largest ocean on Earth.',
