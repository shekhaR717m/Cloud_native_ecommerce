const express = require('express');
const client = require('prom-client');
const Consul = require('consul');
const pino = require('pino')();

const SERVICE = 'notification';
const PORT = process.env.PORT || 3005;
const app = express();
app.use(express.json());

// ---- Prometheus metrics ----
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpHist = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request latency',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
register.registerMetric(httpHist);

app.use((req, res, next) => {
  const end = httpHist.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => end({ status: res.statusCode }));
  next();
});

// ---- Health + metrics endpoints ----
app.get('/health', (_, res) => res.json({ status: 'ok', service: SERVICE }));
app.get('/ready',  (_, res) => res.json({ ready: true }));
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ---- Service-specific routes ----
require('./routes')(app);

// ---- Consul registration ----
async function registerConsul() {
  if (!process.env.CONSUL_HOST) return;
  const consul = new Consul({ host: process.env.CONSUL_HOST, port: process.env.CONSUL_PORT || 8500 });
  try {
    await consul.agent.service.register({
      name: SERVICE,
      id: `${SERVICE}-${process.env.HOSTNAME || PORT}`,
      address: process.env.POD_IP || 'localhost',
      port: Number(PORT),
      check: { http: `http://${process.env.POD_IP || 'localhost'}:${PORT}/health`, interval: '10s' },
    });
    pino.info({ service: SERVICE }, 'registered with consul');
  } catch (e) { pino.error(e, 'consul register failed'); }
}

app.listen(PORT, async () => {
  pino.info(`${SERVICE} listening on ${PORT}`);
  await registerConsul();
});
