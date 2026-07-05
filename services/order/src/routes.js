module.exports = (app) => {
  const orders = new Map();
  app.post('/orders', (req, res) => {
    const { userId, items } = req.body || {};
    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'userId and non-empty items are required' });
    }
    const id = String(orders.size + 1);
    orders.set(id, { id, userId, items, status: 'PENDING' });
    res.status(201).json(orders.get(id));
  });
  app.get('/orders/:id', (req, res) => {
    const o = orders.get(req.params.id);
    o ? res.json(o) : res.status(404).json({ error: 'not found' });
  });
};
