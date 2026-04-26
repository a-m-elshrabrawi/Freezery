const VALID_STATUSES = ['ok', 'low', 'out', 'expired'];

function validateItem(req, res, next) {
  const { name, quantity, min_quantity, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required', field: 'name' });
  }
  if (name.trim().length > 200) {
    return res.status(400).json({ error: 'Name must be 200 characters or less', field: 'name' });
  }
  if (quantity === undefined || quantity === null || quantity === '') {
    return res.status(400).json({ error: 'Quantity is required', field: 'quantity' });
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 0 || !Number.isInteger(Number(quantity))) {
    return res.status(400).json({ error: 'Quantity must be a non-negative integer', field: 'quantity' });
  }
  if (min_quantity !== undefined && min_quantity !== null && min_quantity !== '') {
    const minQty = parseInt(min_quantity, 10);
    if (isNaN(minQty) || minQty < 0 || !Number.isInteger(Number(min_quantity))) {
      return res.status(400).json({ error: 'Min quantity must be a non-negative integer', field: 'min_quantity' });
    }
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}`, field: 'status' });
  }

  next();
}

module.exports = { validateItem };
