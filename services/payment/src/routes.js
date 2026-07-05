module.exports = (app) => {
  app.post('/payments/charge', (req, res) => {
    const { orderId, amount } = req.body || {};
    if (!orderId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'orderId and positive numeric amount are required' });
    }
    res.json({ orderId, amount, status: 'CAPTURED', txnId: 'txn_' + Date.now() });
  });
  app.post('/payments/refund', (req, res) => {
    const { txnId } = req.body || {};
    if (!txnId) return res.status(400).json({ error: 'txnId is required' });
    res.json({ txnId, status: 'REFUNDED' });
  });
};
