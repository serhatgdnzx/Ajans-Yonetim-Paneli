const express = require('express');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ name: 1 }).lean();
  res.render('users/index', { title: 'Ekip', users });
});

router.post('/:id/rol', async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'employee'].includes(role)) return res.redirect('/users');
  const u = await User.findById(req.params.id);
  if (!u || u._id.toString() === req.session.userId) return res.redirect('/users');
  u.role = role;
  await u.save();
  req.session.flash = { type: 'success', message: 'Rol güncellendi.' };
  res.redirect('/users');
});

module.exports = router;
