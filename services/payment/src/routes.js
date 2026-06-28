module.exports = (app) => {
  app.post('/payments/charge', (req, res) => {
    const { orderId, amount } = req.body || {};
    if (!orderId || !amount) return res.status(400).json({ error: 'orderId+amount required' });
    res.json({ orderId, amount, status: 'CAPTURED', txnId: 'txn_' + Date.now() });
  });
  app.post('/payments/refund', (req, res) => res.json({ status: 'REFUNDED' }));
};
