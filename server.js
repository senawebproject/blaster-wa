require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { bootAllSessions } = require('./src/wamanager');
const scheduler = require('./src/scheduler');
const { csrfToken } = require('./src/middleware');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '6mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// PERBAIKAN: Session store diarahkan ke /tmp
// ==========================================
app.use(session({
  store: new SQLiteStore({ 
    db: 'sessions.db', 
    dir: '/tmp' // <--- INI KUNCI PERBAIKANNYA
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(csrfToken);

const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.LOGIN_RATE_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(require('./routes/auth')(loginLimiter));
app.use(require('./routes/templates'));
app.use(require('./routes/settings'));
app.use(require('./routes/blast'));
app.use(require('./routes/api'));

// Home redirect
app.get('/', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`[server] listening on :${PORT}`);
  try { await bootAllSessions(); } catch (e) { console.error('[boot sessions]', e.message); }
  scheduler.start();
});
