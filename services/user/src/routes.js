module.exports = (app) => {
  const users = new Map();
  app.post('/users', (req, res) => {
    const id = String(users.size + 1);
    users.set(id, { id, ...req.body });
    res.status(201).json(users.get(id));
  });
  app.get('/users/:id', (req, res) => {
    const u = users.get(req.params.id);
    u ? res.json(u) : res.status(404).json({ error: 'not found' });
  });
  app.post('/auth/login', (req, res) => res.json({ token: 'jwt.demo.token' }));
};
