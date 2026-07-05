const express = require('express');
const client = require('prom-client');
const pino = require('pino')();

const SERVICE = 'user';
const PORT = process.env.PORT || 3001;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);
const app = express();
let ready = true;
let serviceId;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use((_, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

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
  const end = httpHist.startTimer({ method: req.method });
  res.on('finish', () => {
    const route = req.route?.path || (res.statusCode === 404 ? 'unmatched' : req.path);
    end({ route, status: res.statusCode });
  });
  next();
});

// ---- Health + metrics endpoints ----
app.get('/health', (_, res) => res.json({ status: 'ok', service: SERVICE }));
app.get('/ready',  (_, res) => ready ? res.json({ ready: true }) : res.status(503).json({ ready: false }));
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ---- Service-specific routes ----
require('./routes')(app);

// ---- Consul registration ----
async function registerConsul() {
  if (!process.env.CONSUL_HOST) return;
  serviceId = `${SERVICE}-${process.env.HOSTNAME || PORT}`;
  try {
    const address = process.env.POD_IP || 'localhost';
    const response = await fetch(`http://${process.env.CONSUL_HOST}:${process.env.CONSUL_PORT || 8500}/v1/agent/service/register`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Name: SERVICE,
        ID: serviceId,
        Address: address,
        Port: Number(PORT),
        Check: { HTTP: `http://${address}:${PORT}/health`, Interval: '10s' },
      }),
    });
    if (!response.ok) throw new Error(`consul register failed with ${response.status}`);
    pino.info({ service: SERVICE }, 'registered with consul');
  } catch (e) { pino.error(e, 'consul register failed'); }
}

async function deregisterConsul() {
  if (!process.env.CONSUL_HOST || !serviceId) return;
  const response = await fetch(`http://${process.env.CONSUL_HOST}:${process.env.CONSUL_PORT || 8500}/v1/agent/service/deregister/${serviceId}`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error(`consul deregister failed with ${response.status}`);
}

app.use((_, res) => res.status(404).json({ error: 'not found' }));
app.use((err, req, res, next) => {
  pino.error({ err, path: req.path }, 'request failed');
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'internal server error' });
});

const server = app.listen(PORT, async () => {
  pino.info(`${SERVICE} listening on ${PORT}`);
  await registerConsul();
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

async function shutdown(signal) {
  ready = false;
  pino.info({ signal }, 'shutdown started');
  if (serviceId) {
    try { await deregisterConsul(); }
    catch (e) { pino.warn(e, 'consul deregister failed'); }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
