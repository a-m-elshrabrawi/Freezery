const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validateItem } = require('../middleware/validate');
const { getItems, getItem, createItem, updateItem, deleteItem, getItemsSummary } = require('../controllers/itemsController');

router.get('/summary', requireAuth, getItemsSummary);
router.get('/', requireAuth, getItems);
router.get('/:id', requireAuth, getItem);
router.post('/', requireAuth, validateItem, createItem);
router.put('/:id', requireAuth, validateItem, updateItem);
router.delete('/:id', requireAuth, deleteItem);

module.exports = router;
