module.exports = (app) => {
  const catalog = [
    { id: '1', name: 'T-Shirt', price: 19.99, stock: 100 },
    { id: '2', name: 'Sneakers', price: 79.99, stock: 50 },
  ];
  app.get('/products', (_, res) => res.json(catalog));
  app.get('/products/:id', (req, res) => {
    const p = catalog.find(x => x.id === req.params.id);
    p ? res.json(p) : res.status(404).json({ error: 'not found' });
  });
};
