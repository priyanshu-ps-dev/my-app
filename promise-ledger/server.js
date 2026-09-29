const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const ROOT = __dirname;
const DATA_FILE = process.env.PROMISE_LEDGER_DATA || path.join(ROOT, '.promise-ledger-data.json');
const API_PREFIX = '/api';
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const rateBuckets = new Map();
let writeQueue = Promise.resolve();

function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function isoAgo(days = 0, hours = 0) {
  return new Date(Date.now() - (days * 86400000) - (hours * 3600000)).toISOString();
}

function seedData() {
  return [
    { id: crypto.randomUUID(), customer: 'Apex Traders', phone: '+91 98765 43210', amount: 48000, promiseDate: localDate(-3), note: 'Invoice #INV-1042 · Website milestone', paid: false, createdAt: isoAgo(9), paidAt: null, history: [{ note: 'Accounts team requested two extra days after approval.', at: isoAgo(1) }] },
    { id: crypto.randomUUID(), customer: 'Northstar Studio', phone: '+91 99887 76655', amount: 27500, promiseDate: localDate(0), note: 'Final design milestone', paid: false, createdAt: isoAgo(5), paidAt: null, history: [{ note: 'Client confirmed transfer will be initiated today.', at: isoAgo(0, 3) }] },
    { id: crypto.randomUUID(), customer: 'BluePeak Services', phone: '+91 91234 56789', amount: 18000, promiseDate: localDate(2), note: 'Monthly retainer · September', paid: false, createdAt: isoAgo(2), paidAt: null, history: [] },
    { id: crypto.randomUUID(), customer: 'Orbit Retail', phone: '+91 90011 22334', amount: 36000, promiseDate: localDate(6), note: 'E-commerce phase 2', paid: false, createdAt: isoAgo(4), paidAt: null, history: [{ note: 'Purchase order approved. Payment scheduled next week.', at: isoAgo(0, 10) }] },
    { id: crypto.randomUUID(), customer: 'PixelForge Media', phone: '+91 90123 45678', amount: 22000, promiseDate: localDate(-5), note: 'Campaign landing page', paid: true, createdAt: isoAgo(10), paidAt: isoAgo(1), history: [{ note: 'Payment received and reconciled.', at: isoAgo(1) }] },
    { id: crypto.randomUUID(), customer: 'Nova Dental', phone: '+91 93210 45670', amount: 31500, promiseDate: localDate(-6), note: 'Website + appointment module', paid: true, createdAt: isoAgo(14), paidAt: isoAgo(3), history: [{ note: 'Payment received after finance confirmation.', at: isoAgo(3) }] },
    { id: crypto.randomUUID(), customer: 'Canvas & Co.', phone: '+91 88770 11223', amount: 14500, promiseDate: localDate(-8), note: 'Brand landing page', paid: true, createdAt: isoAgo(13), paidAt: isoAgo(5), history: [{ note: 'Payment received via bank transfer.', at: isoAgo(5) }] },
    { id: crypto.randomUUID(), customer: 'Metro Fitness', phone: '+91 97654 22110', amount: 42000, promiseDate: localDate(1), note: 'Membership portal milestone', paid: false, createdAt: isoAgo(3), paidAt: null, history: [{ note: 'Owner asked for final invoice copy.', at: isoAgo(0, 20) }] }
  ];
}

function normalizeRecord(input) {
  return {
    id: input.id || crypto.randomUUID(),
    customer: String(input.customer || '').trim().slice(0, 80),
    phone: String(input.phone || '').trim().slice(0, 30),
    amount: Math.max(0, Number(input.amount || 0)),
    promiseDate: String(input.promiseDate || '').slice(0, 10),
    note: String(input.note || '').trim().slice(0, 300),
    paid: Boolean(input.paid),
    createdAt: input.createdAt || new Date().toISOString(),
    paidAt: input.paidAt || null,
    history: Array.isArray(input.history) ? input.history.slice(-100).map((h) => ({
      note: String(h.note || '').slice(0, 300),
      at: h.at || new Date().toISOString()
    })) : []
  };
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(parsed) && parsed.length) return parsed.map(normalizeRecord);
  } catch (_) {}
  const seeded = seedData();
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2)); } catch (_) {}
  return seeded;
}

let records = readStore();

function persist() {
  const snapshot = JSON.stringify(records, null, 2);
  writeQueue = writeQueue.then(() => fs.promises.writeFile(DATA_FILE, snapshot)).catch((error) => {
    console.error('persist_failed', error.message);
  });
  return writeQueue;
}

function json(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...securityHeaders(),
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (_) { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function validatePromise(body) {
  const customer = String(body.customer || '').trim();
  const amount = Number(body.amount);
  const promiseDate = String(body.promiseDate || '');
  if (!customer) return 'Customer name is required.';
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(promiseDate)) return 'Promise date must be YYYY-MM-DD.';
  return null;
}

function dayKey(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function analytics() {
  const now = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      collected: records.filter((r) => r.paidAt && dayKey(r.paidAt) === key).reduce((s, r) => s + Number(r.amount || 0), 0),
      promises: records.filter((r) => r.createdAt && dayKey(r.createdAt) === key).reduce((s, r) => s + Number(r.amount || 0), 0)
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      records: records.length,
      collected: records.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0),
      outstanding: records.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0)
    },
    days
  };
}

function checkRateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > 60000) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= 180;
}

function getRecord(id) {
  return records.find((r) => r.id === id);
}

async function handleApi(req, res, pathname) {
  if (!checkRateLimit(req)) return json(res, 429, { error: 'Too many requests. Try again shortly.' });

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      service: 'promise-ledger-api',
      version: '2.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      records: records.length,
      persistence: 'server-file'
    });
  }

  if (req.method === 'GET' && pathname === '/api/promises') {
    return json(res, 200, { records });
  }

  if (req.method === 'GET' && pathname === '/api/analytics') {
    return json(res, 200, analytics());
  }

  if (req.method === 'POST' && pathname === '/api/promises') {
    const body = await parseBody(req);
    const error = validatePromise(body);
    if (error) return json(res, 422, { error });
    const record = normalizeRecord({
      ...body,
      id: crypto.randomUUID(),
      paid: false,
      createdAt: new Date().toISOString(),
      paidAt: null,
      history: [{ note: `Payment promise recorded for ${body.promiseDate}.`, at: new Date().toISOString() }]
    });
    records.push(record);
    await persist();
    return json(res, 201, { record, records });
  }

  if (req.method === 'POST' && pathname === '/api/reset') {
    records = seedData();
    await persist();
    return json(res, 200, { records });
  }

  const recordMatch = pathname.match(/^\/api\/promises\/([^/]+)$/);
  if (recordMatch) {
    const id = decodeURIComponent(recordMatch[1]);
    const record = getRecord(id);
    if (!record) return json(res, 404, { error: 'Promise not found.' });

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      if (body.promiseDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.promiseDate))) {
        return json(res, 422, { error: 'Invalid promise date.' });
      }
      if (body.amount !== undefined && (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0)) {
        return json(res, 422, { error: 'Invalid amount.' });
      }
      if (body.promiseDate !== undefined && body.promiseDate !== record.promiseDate) {
        record.history.push({ note: `Promise date changed from ${record.promiseDate} to ${body.promiseDate}.`, at: new Date().toISOString() });
        record.promiseDate = String(body.promiseDate);
      }
      if (body.paid === true && !record.paid) {
        record.paid = true;
        record.paidAt = new Date().toISOString();
        record.history.push({ note: 'Payment marked as received.', at: record.paidAt });
      }
      if (body.paid === false && record.paid) {
        record.paid = false;
        record.paidAt = null;
        record.history.push({ note: 'Payment status reopened.', at: new Date().toISOString() });
      }
      if (body.customer !== undefined) record.customer = String(body.customer).trim().slice(0, 80);
      if (body.phone !== undefined) record.phone = String(body.phone).trim().slice(0, 30);
      if (body.note !== undefined) record.note = String(body.note).trim().slice(0, 300);
      if (body.amount !== undefined) record.amount = Number(body.amount);
      await persist();
      return json(res, 200, { record, records });
    }

    if (req.method === 'DELETE') {
      records = records.filter((r) => r.id !== id);
      await persist();
      return json(res, 200, { deleted: id, records });
    }
  }

  const historyMatch = pathname.match(/^\/api\/promises\/([^/]+)\/history$/);
  if (historyMatch && req.method === 'POST') {
    const id = decodeURIComponent(historyMatch[1]);
    const record = getRecord(id);
    if (!record) return json(res, 404, { error: 'Promise not found.' });
    const body = await parseBody(req);
    const note = String(body.note || '').trim().slice(0, 300);
    if (!note) return json(res, 422, { error: 'Follow-up note is required.' });
    record.history.push({ note, at: new Date().toISOString() });
    record.history = record.history.slice(-100);
    await persist();
    return json(res, 201, { record, records });
  }

  return json(res, 404, { error: 'API route not found.' });
}

function serveStatic(req, res, pathname) {
  let requestPath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const relative = normalized.replace(/^[/\\]+/, '');
  const filePath = path.join(ROOT, relative);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        ...securityHeaders(),
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const fallback = path.join(ROOT, 'index.html');
    fs.readFile(fallback, (fallbackErr, data) => {
      if (fallbackErr) {
        res.writeHead(404, { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }
      res.writeHead(200, { ...securityHeaders(), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  res.on('finish', () => {
    if (pathname.startsWith(API_PREFIX)) {
      console.log(JSON.stringify({ method: req.method, path: pathname, status: res.statusCode, ms: Date.now() - started }));
    }
  });

  try {
    if (pathname.startsWith(API_PREFIX)) return await handleApi(req, res, pathname);
    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error('request_failed', error);
    if (!res.headersSent) return json(res, error.status || 500, { error: error.status ? error.message : 'Unexpected server error.' });
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Promise Ledger v2 running on port ${PORT}`);
});
