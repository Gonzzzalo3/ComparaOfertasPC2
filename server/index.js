import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfferRepository, filterOffers, getLocalDate } from './offers.js';

const app = express();
const port = Number(process.env.PORT) || 10000;
const repository = createOfferRepository();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedOrigin = process.env.APP_ORIGIN;

app.disable('x-powered-by');
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined));
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'");
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', dataMode: repository.mode, timeZone: 'America/Lima' }));
app.get('/api/offers', async (req, res, next) => {
  try {
    const offers = await repository.listOffers();
    const items = filterOffers(offers, {
      search: typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '',
      category: typeof req.query.category === 'string' ? req.query.category.slice(0, 60) : '',
      chain: typeof req.query.chain === 'string' ? req.query.chain.slice(0, 60) : '',
      date: getLocalDate(),
    });
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ items, count: items.length, dataMode: repository.mode });
  } catch (error) { next(error); }
});

app.use('/assets', express.static(path.join(root, 'dist/assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(path.join(root, 'dist'), { maxAge: '1h' }));
app.get('*path', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(503).json({ error: 'No se pudo cargar el catálogo. Intenta nuevamente en unos minutos.' });
});

if (process.env.NODE_ENV !== 'test') app.listen(port, '0.0.0.0', () => console.log(`ComparaOfertas API y web en http://localhost:${port} (${repository.mode})`));

export default app;
