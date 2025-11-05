const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

const openai = new OpenAI({
  baseURL: process.env.BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY
});

const DEFAULT_STYLE = '深圳打工人，下班写作，语气真实、接地气、少鸡汤多方法、略带自嘲。';

router.post('/', async (req, res) => {
  const {
    title = '未命名文章',
    content,
    facts = [],
    blacklist = [],
    targetWordCount = 2000,
    style = DEFAULT_STYLE,
    toneStrength = 0.6,
    emojiDensity = 0.3,
    rewriteMode = 'balanced'
  } = req.body || {};

  if (!content) {
    return res.status(400).json({ error: 'Missing article content to rewrite.' });
  }

  const rewriteRules = `Rewrite Rules:\n1. Keep all verifiable facts.\n2. Change structure to: Hook → Pain Point → Insight → Action Steps → Quick Plan → Closing.\n3. Use first-person Shenzhen worker perspective.\n4. Replace examples and metaphors with fresh, relatable ones.\n5. Generate 10 catchy titles and 5 image suggestions.\n6. Output a JSON object with the required structure.\nAdditional stylistic controls:\n- Target word count: ${targetWordCount}.\n- Tone strength (0-1): ${toneStrength}.\n- Emoji density (0-1): ${emojiDensity}.\n- Rewrite aggressiveness: ${rewriteMode}.`;

  const userPrompt = `Input Article Title: ${title}\nInput Article Body: ${content}\n\nTarget Audience: WeChat readers (career/self-growth)\nTarget Word Count: ${targetWordCount}\nFacts to Keep: ${JSON.stringify(facts)}\nBlacklisted Words: ${JSON.stringify(blacklist)}\nPreferred Style: ${style}\n${rewriteRules}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || 'openai/gpt-5-codex',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an experienced WeChat article rewriting coach. Preserve factual information and conclusions, but rebuild structure, change examples, and apply the user’s IP style.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const message = response.choices?.[0]?.message?.content;

    if (!message) {
      throw new Error('Model did not return any content.');
    }

    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch (err) {
      return res.status(502).json({
        error: 'Failed to parse model response as JSON.',
        raw: message
      });
    }

    const similarityEstimate = parsed.similarity_estimate ?? null;
    if (similarityEstimate !== null && similarityEstimate > 0.5) {
      parsed.de_dup_suggestions = parsed.de_dup_suggestions || [];
      parsed.de_dup_suggestions.push('Model estimated similarity above recommended threshold. Consider regenerating with higher rewrite aggressiveness.');
    }

    res.json({
      ...parsed,
      metadata: {
        model: process.env.MODEL_NAME || 'openai/gpt-5-codex',
        toneStrength,
        emojiDensity,
        rewriteMode
      }
    });
  } catch (error) {
    console.error('Rewrite error:', error);
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to generate rewrite.',
      details: error.response?.data || null
    });
  }
});

module.exports = router;
