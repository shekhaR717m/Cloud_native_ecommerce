module.exports = (app) => {
  const orders = new Map();
  app.post('/orders', (req, res) => {
    const id = String(orders.size + 1);
    orders.set(id, { id, status: 'PENDING', ...req.body });
    res.status(201).json(orders.get(id));
  });
  app.get('/orders/:id', (req, res) => {
    const o = orders.get(req.params.id);
    o ? res.json(o) : res.status(404).json({ error: 'not found' });
  });
};
