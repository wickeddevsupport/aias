import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAiActions } from './ai/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/ai/generate', (req, res) => {
  try {
    const result = generateAiActions(req.body);
    res.json(result);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ summary: 'AI failed to process the request.', actions: [] });
  }
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
