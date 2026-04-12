import 'dotenv/config';
import express from 'express';
import openrouterHandler from './api/openrouter';
import leaderboardHandler from './api/leaderboard';

const app = express();
app.use(express.json());

app.all('/api/openrouter', async (req: any, res: any) => {
  try {
    await openrouterHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.all('/api/leaderboard', async (req: any, res: any) => {
  try {
    await leaderboardHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 5001;
app.listen(PORT, 'localhost', () => {
  console.log(`API server running on http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  WARNING: OPENROUTER_API_KEY is not set. AI generation will use fallback questions.');
  } else {
    console.log('✓ OPENROUTER_API_KEY is configured.');
  }
});
