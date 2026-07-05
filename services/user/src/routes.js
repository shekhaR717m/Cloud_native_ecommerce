module.exports = (app) => {
  const users = new Map();
  app.post('/users', (req, res) => {
    const { email, name } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: 'email and name are required' });
    const id = String(users.size + 1);
    users.set(id, { id, email, name });
    res.status(201).json(users.get(id));
  });
  app.get('/users/:id', (req, res) => {
    const u = users.get(req.params.id);
    u ? res.json(u) : res.status(404).json({ error: 'not found' });
  });
  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    res.json({ token: 'jwt.demo.token' });
  });
};
