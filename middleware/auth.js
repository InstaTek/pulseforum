// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function attachUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = { requireAuth, attachUser };
