module.exports = (app) => {
  app.post('/notify/email', (req, res) => {
    const { to, subject } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });
    res.json({ queued: true, channel: 'email', to });
  });
  app.post('/notify/sms', (req, res) => {
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
    res.json({ queued: true, channel: 'sms', to });
  });
};
