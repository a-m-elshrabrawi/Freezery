const Groq = require('groq-sdk');
const { query } = require('../db');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getRecommendations(req, res, next) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: 'GROQ_API_KEY is not configured. See setup guide.' });
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

    const today = new Date().toISOString().split('T')[0];
    const inventoryJson = JSON.stringify(items, null, 2);

    const prompt = `You are a smart home inventory assistant. Today's date is ${today}.

Analyze the grocery inventory below and return a JSON array of recommendations.

STRICT RULES:
- Exactly ONE recommendation per item — never repeat an item
- Use EXACT values from the data (quantities, units, dates) — never invent or approximate
- Write specific reasons referencing the actual numbers (e.g. "Only 1 box left, minimum is 2")
- Do NOT say "quantity below minimum quantity" as a generic reason — explain the specifics

PRIORITY RULES (based on today = ${today}):
- "high": status is 'out', quantity < min_quantity, or expiry within 7 days
- "medium": expiry within 30 days, or quantity is at or just above min_quantity
- "low": well stocked, no expiry concern

ACTION — pick the single best fit for each item (you are not limited to these examples):
"Restock" | "Use soon" | "Use before expiry" | "Freeze before expiry" | "Rotate stock" |
"Buy in bulk" | "Check condition" | "Consume first" | "All good" | "Monitor levels"

Each object must have exactly:
{ "item_id": <number>, "item_name": <string>, "category": <string>, "priority": "high"|"medium"|"low", "action": <string>, "reason": <string> }

Return ONLY a valid JSON array. No markdown, no code fences, no explanation.

INVENTORY (${items.length} items):
${inventoryJson}`;

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content.trim();

    let recommendations;
    try {
      const parsed = JSON.parse(text);
      // Deduplicate by item_id, keeping the first occurrence
      const seen = new Set();
      recommendations = parsed.filter(r => {
        if (!r.item_id || seen.has(r.item_id)) return false;
        seen.add(r.item_id);
        return true;
      });
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
