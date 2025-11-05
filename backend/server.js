const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const rewriteRoute = require('./routes/rewrite');
const checkSimilarityRoute = require('./routes/checkSimilarity');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CopyMind API' });
});

app.use('/api/rewrite', rewriteRoute);
app.use('/api/check_similarity', checkSimilarityRoute);

app.get('/api/models', (_req, res) => {
  res.json({
    default: process.env.MODEL_NAME || 'openai/gpt-5-codex',
    supported: [
      process.env.MODEL_NAME || 'openai/gpt-5-codex',
      'openai/gpt-4.1-mini',
      'anthropic/claude-3.5-sonnet'
    ]
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`CopyMind backend listening on port ${port}`);
});
