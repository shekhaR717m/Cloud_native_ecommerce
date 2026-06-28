module.exports = (app) => {
  app.post('/notify/email', (req, res) => res.json({ queued: true, channel: 'email', to: req.body?.to }));
  app.post('/notify/sms',   (req, res) => res.json({ queued: true, channel: 'sms',   to: req.body?.to }));
};
