const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  if (req.session.clientId) return res.redirect('/portal');
  res.render('auth/login', { title: 'Giriş', error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.render('auth/login', { title: 'Giriş', error: 'E-posta veya şifre hatalı.' });
    }
    delete req.session.clientId;
    delete req.session.clientName;
    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    req.session.role = user.role;
    req.session.flash = { type: 'success', message: `Hoş geldin, ${user.name}.` };
    res.redirect('/dashboard');
  } catch (e) {
    res.render('auth/login', { title: 'Giriş', error: 'Bir hata oluştu.' });
  }
});

router.get('/register', async (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  if (req.session.clientId) return res.redirect('/portal');
  const count = await User.countDocuments();
  res.render('auth/register', { title: 'Kayıt', error: null, isFirstUser: count === 0 });
});

router.post('/register', async (req, res) => {
  const { name, email, password, password2, phone } = req.body;
  const count = await User.countDocuments();
  if (!name?.trim() || !email?.trim() || !password) {
    return res.render('auth/register', {
      title: 'Kayıt',
      error: 'Tüm alanları doldurun.',
      isFirstUser: count === 0,
    });
  }
  if (password !== password2) {
    return res.render('auth/register', {
      title: 'Kayıt',
      error: 'Şifreler eşleşmiyor.',
      isFirstUser: count === 0,
    });
  }
  if (password.length < 6) {
    return res.render('auth/register', {
      title: 'Kayıt',
      error: 'Şifre en az 6 karakter olmalı.',
      isFirstUser: count === 0,
    });
  }
  try {
    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) {
      return res.render('auth/register', {
        title: 'Kayıt',
        error: 'Bu e-posta zaten kayıtlı.',
        isFirstUser: count === 0,
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const role = count === 0 ? 'admin' : 'employee';
    const user = await User.create({
      name: name.trim(),
      email: String(email).toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      passwordHash,
      role,
    });
    delete req.session.clientId;
    delete req.session.clientName;
    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    req.session.role = user.role;
    req.session.flash = {
      type: 'success',
      message: role === 'admin' ? 'İlk kullanıcı — yönetici hesabı oluşturuldu.' : 'Hesabınız oluşturuldu.',
    };
    res.redirect('/dashboard');
  } catch (e) {
    res.render('auth/register', {
      title: 'Kayıt',
      error: 'Kayıt sırasında hata oluştu.',
      isFirstUser: count === 0,
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
