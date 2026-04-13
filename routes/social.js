const express = require('express');
const SocialPost = require('../models/SocialPost');
const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await SocialPost.find()
    .populate('client', 'name customerCode')
    .populate('workLog', 'workCode')
    .sort({ date: -1 })
    .limit(200)
    .lean();
  res.render('social/index', { title: 'Sosyal medya', items });
});

router.get('/yeni', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  res.render('social/form', { title: 'Sosyal kayıt ekle', item: null, clients, workLogs, error: null });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  if (!b.client || !b.date) {
    return res.render('social/form', {
      title: 'Sosyal kayıt ekle',
      item: b,
      clients,
      workLogs,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  await SocialPost.create({
    date: new Date(b.date),
    client: b.client,
    workLog: b.workLog || undefined,
    platform: b.platform?.trim(),
    contentTitle: b.contentTitle?.trim(),
    postType: b.postType?.trim(),
    interaction: parseInt(b.interaction, 10) || 0,
    views: parseInt(b.views, 10) || 0,
    likes: parseInt(b.likes, 10) || 0,
    comments: parseInt(b.comments, 10) || 0,
    shares: parseInt(b.shares, 10) || 0,
    status: b.status?.trim() || 'Yayında',
  });
  req.session.flash = { type: 'success', message: 'Kayıt eklendi.' };
  res.redirect('/social');
});

router.get('/:id/duzenle', async (req, res) => {
  const item = await SocialPost.findById(req.params.id).lean();
  if (!item) return res.redirect('/social');
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  res.render('social/form', { title: 'Sosyal kayıt düzenle', item, clients, workLogs, error: null });
});

router.put('/:id', async (req, res) => {
  const b = req.body;
  const item = await SocialPost.findById(req.params.id);
  if (!item) return res.redirect('/social');
  if (!b.client || !b.date) {
    const clients = await Client.find().sort({ name: 1 }).lean();
    const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
    return res.render('social/form', {
      title: 'Sosyal kayıt düzenle',
      item: { ...item.toObject(), ...b },
      clients,
      workLogs,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  Object.assign(item, {
    date: new Date(b.date),
    client: b.client,
    workLog: b.workLog || null,
    platform: b.platform?.trim(),
    contentTitle: b.contentTitle?.trim(),
    postType: b.postType?.trim(),
    interaction: parseInt(b.interaction, 10) || 0,
    views: parseInt(b.views, 10) || 0,
    likes: parseInt(b.likes, 10) || 0,
    comments: parseInt(b.comments, 10) || 0,
    shares: parseInt(b.shares, 10) || 0,
    status: b.status?.trim(),
  });
  await item.save();
  req.session.flash = { type: 'success', message: 'Güncellendi.' };
  res.redirect('/social');
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await SocialPost.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Silindi.' };
  res.redirect('/social');
});

module.exports = router;
