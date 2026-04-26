const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getRecommendations(req, res, next) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured. See setup guide.' });
    }

    const userId = req.user.id;
    const cached = cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const itemsResult = await query(
      `SELECT i.id, i.name, c.name AS category, i.quantity, i.unit, i.min_quantity,
              i.status, i.expiry_date, i.location
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.user_id = $1
       ORDER BY i.status DESC, i.expiry_date ASC NULLS LAST`,
      [userId]
    );

    const items = itemsResult.rows;

    if (items.length === 0) {
      return res.json({ recommendations: [], generated_at: new Date().toISOString(), item_count: 0 });
    }

    const inventoryJson = JSON.stringify(items, null, 2);

    const prompt = `You are a smart grocery inventory assistant. Analyze the following grocery inventory data and return a JSON array of recommendations. Each recommendation must have:
- "priority": "high" | "medium" | "low"
- "item_name": string
- "action": string (e.g. "Restock", "Use before expiry", "Add to shopping list", "Check freshness")
- "reason": string (1-2 sentences explaining why)
- "category": string

Focus on: items with status 'low' or 'out', items with approaching or past expiry dates, items with quantity below min_quantity, and patterns suggesting restocking cadence. Think like a practical household grocery planner.

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.

INVENTORY DATA:
${inventoryJson}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    let recommendations;
    try {
      const text = message.content[0].text.trim();
      recommendations = JSON.parse(text);
    } catch {
      recommendations = [];
    }

    const responseData = {
      recommendations,
      generated_at: new Date().toISOString(),
      item_count: items.length,
    };

    cache.set(userId, { data: responseData, timestamp: Date.now() });
    res.json(responseData);
  } catch (err) {
    next(err);
  }
}

module.exports = { getRecommendations };
