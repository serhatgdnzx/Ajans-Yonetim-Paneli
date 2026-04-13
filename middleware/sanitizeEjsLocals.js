function sanitizeEjsLocals(req, res, next) {
  delete res.locals.include;
  next();
}

module.exports = { sanitizeEjsLocals };
