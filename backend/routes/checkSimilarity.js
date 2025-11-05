const express = require('express');
const natural = require('natural');

const router = express.Router();

function ngramOverlap(original = '', rewritten = '', n = 3) {
  if (!original || !rewritten) return 0;
  const originalNgrams = new Set(natural.NGrams.ngrams(original, n).map((gram) => gram.join('').toLowerCase()));
  const rewrittenNgrams = new Set(natural.NGrams.ngrams(rewritten, n).map((gram) => gram.join('').toLowerCase()));
  if (originalNgrams.size === 0) return 0;
  let overlap = 0;
  rewrittenNgrams.forEach((gram) => {
    if (originalNgrams.has(gram)) overlap += 1;
  });
  return overlap / originalNgrams.size;
}

function jaccardSimilarity(original = '', rewritten = '') {
  const tokenizer = new natural.WordTokenizer();
  const originalTokens = new Set(tokenizer.tokenize(original.toLowerCase()));
  const rewrittenTokens = new Set(tokenizer.tokenize(rewritten.toLowerCase()));
  const intersection = new Set([...originalTokens].filter((token) => rewrittenTokens.has(token)));
  const union = new Set([...originalTokens, ...rewrittenTokens]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

async function cosineEmbedding(original = '', rewritten = '') {
  if (!original || !rewritten) return 0;

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({
      baseURL: process.env.BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const response = await client.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      input: [original, rewritten]
    });

    const [origVec, rewriteVec] = response.data.map((item) => item.embedding);
    const dot = origVec.reduce((acc, val, idx) => acc + val * rewriteVec[idx], 0);
    const origMag = Math.sqrt(origVec.reduce((acc, val) => acc + val * val, 0));
    const rewriteMag = Math.sqrt(rewriteVec.reduce((acc, val) => acc + val * val, 0));
    return dot / (origMag * rewriteMag);
  } catch (error) {
    console.warn('Semantic similarity check failed, returning 0.', error.message);
    return 0;
  }
}

router.post('/', async (req, res) => {
  const { original = '', rewritten = '' } = req.body || {};

  if (!original || !rewritten) {
    return res.status(400).json({ error: 'Both original and rewritten texts are required.' });
  }

  const charOverlap = ngramOverlap(original, rewritten, 3);
  const jaccard = jaccardSimilarity(original, rewritten);
  const semantic = await cosineEmbedding(original, rewritten);
  const pass = charOverlap < 0.2 && jaccard < 0.25 && semantic < 0.75;

  res.json({
    charOverlap,
    jaccard,
    semantic,
    pass
  });
});

module.exports = router;
