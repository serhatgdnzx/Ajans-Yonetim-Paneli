function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { type: 'error', message: 'Giriş yapmalısınız.' };
    return res.redirect('/auth/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Yetkisiz Giriş',
      message: 'Bu sayfaya sadece yöneticiler erişebilir.',
    });
  }
  next();
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session.userId
    ? {
        id: req.session.userId,
        name: req.session.userName,
        role: req.session.role,
      }
    : null;
  res.locals.portalClient =
    req.session.clientId && req.session.clientName
      ? { id: req.session.clientId, name: req.session.clientName }
      : null;
  next();
}

function requirePortalAuth(req, res, next) {
  if (!req.session.clientId) {
    req.session.flash = { type: 'error', message: 'Müşteri portalına giriş yapmalısınız.' };
    return res.redirect('/portal/login');
  }
  next();
}

module.exports = { requireAuth, requireAdmin, attachUser, requirePortalAuth };
