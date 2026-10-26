function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.redirect('/login');
}

function requireAuthApi(req, res, next) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

function csrfToken(req, res, next) {
  if (!req.session.csrf) {
    req.session.csrf = require('crypto').randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrf;
  next();
}

function verifyCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const token = req.body?._csrf || req.headers['x-csrf-token'];
  if (token && token === req.session.csrf) return next();
  return res.status(403).json({ error: 'csrf_mismatch' });
}

module.exports = { requireAuth, requireAuthApi, csrfToken, verifyCsrf };
