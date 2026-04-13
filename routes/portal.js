const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ClientMessage = require('../models/ClientMessage');
const { requirePortalAuth } = require('../middleware/auth');

const router = express.Router();

const COLUMN_LABEL = {
  yapilacak: 'Yapılacak',
  devam: 'Devam ediyor',
  bitti: 'Bitti',
};

const STATUS_LABEL = {
  devam_ediyor: 'Devam ediyor',
  bitti: 'Tamamlandı',
};

router.get('/login', (req, res) => {
  if (req.session.clientId) return res.redirect('/portal');
  res.render('portal/login', { title: 'Müşteri girişi', error: null });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '')
    .toLowerCase()
    .trim();
  const password = req.body.password || '';
  if (!email || !password) {
    return res.render('portal/login', { title: 'Müşteri girişi', error: 'E-posta ve şifre gerekli.' });
  }
  try {
    const client = await Client.findOne({ portalEnabled: true, portalEmail: email }).select(
      '+portalPasswordHash'
    );
    if (!client || !client.portalPasswordHash || !(await bcrypt.compare(password, client.portalPasswordHash))) {
      return res.render('portal/login', { title: 'Müşteri girişi', error: 'E-posta veya şifre hatalı.' });
    }
    delete req.session.userId;
    delete req.session.userName;
    delete req.session.role;
    req.session.clientId = client._id.toString();
    req.session.clientName = client.name;
    req.session.flash = { type: 'success', message: `Hoş geldiniz, ${client.name}.` };
    res.redirect('/portal');
  } catch (e) {
    res.render('portal/login', { title: 'Müşteri girişi', error: 'Giriş sırasında hata oluştu.' });
  }
});

router.post('/logout', (req, res) => {
  delete req.session.clientId;
  delete req.session.clientName;
  req.session.flash = { type: 'success', message: 'Çıkış yapıldı.' };
  res.redirect('/portal/login');
});

router.use(requirePortalAuth);

router.get('/', async (req, res) => {
  const cid = req.session.clientId;
  const projects = await Project.find({ client: cid })
    .populate('owner', 'name email phone')
    .sort({ updatedAt: -1 })
    .lean();
  res.render('portal/dashboard', {
    title: 'İşlerim',
    projects,
    statusLabel: STATUS_LABEL,
  });
});

router.get('/projeler/:id', async (req, res) => {
  const cid = req.session.clientId;
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/portal');
  const project = await Project.findOne({ _id: req.params.id, client: cid })
    .populate('owner', 'name email phone')
    .populate('client', 'name')
    .lean();
  if (!project) return res.redirect('/portal');
  const tasks = await Task.find({ project: project._id }).sort({ order: 1, createdAt: 1 }).lean();
  res.render('portal/project', {
    title: project.title,
    project,
    tasks,
    columnLabel: COLUMN_LABEL,
    statusLabel: STATUS_LABEL,
  });
});

router.post('/projeler/:id/mesaj', async (req, res) => {
  const cid = req.session.clientId;
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/portal');
  const body = String(req.body.body || '').trim();
  if (!body) {
    req.session.flash = { type: 'error', message: 'Mesaj boş olamaz.' };
    return res.redirect('/portal/projeler/' + req.params.id);
  }
  const project = await Project.findOne({ _id: req.params.id, client: cid }).lean();
  if (!project) return res.redirect('/portal');
  await ClientMessage.create({ client: cid, project: project._id, body });
  req.session.flash = {
    type: 'success',
    message: 'Mesajınız proje yöneticisine iletildi.',
  };
  res.redirect('/portal/projeler/' + req.params.id);
});

module.exports = router;
