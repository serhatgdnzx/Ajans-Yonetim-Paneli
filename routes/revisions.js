const express = require('express');
const Revision = require('../models/Revision');
const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await Revision.find()
    .populate('client', 'name customerCode')
    .populate('workLog', 'workCode')
    .sort({ date: -1 })
    .limit(200)
    .lean();
  res.render('revisions/index', { title: 'Revizyonlar', items });
});

router.get('/yeni', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  res.render('revisions/form', { title: 'Revizyon ekle', item: null, clients, workLogs, error: null });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  if (!b.client || !b.date) {
    return res.render('revisions/form', {
      title: 'Revizyon ekle',
      item: b,
      clients,
      workLogs,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  await Revision.create({
    date: new Date(b.date),
    client: b.client,
    workLog: b.workLog || undefined,
    revisionNumber: parseInt(b.revisionNumber, 10) || 1,
    title: b.title?.trim(),
    requestedBy: b.requestedBy?.trim(),
    topic: b.topic?.trim(),
    whatWasDone: b.whatWasDone?.trim(),
    status: b.status?.trim() || 'Bekliyor',
  });
  req.session.flash = { type: 'success', message: 'Revizyon kaydedildi.' };
  res.redirect('/revisions');
});

router.get('/:id/duzenle', async (req, res) => {
  const item = await Revision.findById(req.params.id).lean();
  if (!item) return res.redirect('/revisions');
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
  res.render('revisions/form', { title: 'Revizyon düzenle', item, clients, workLogs, error: null });
});

router.put('/:id', async (req, res) => {
  const b = req.body;
  const item = await Revision.findById(req.params.id);
  if (!item) return res.redirect('/revisions');
  if (!b.client || !b.date) {
    const clients = await Client.find().sort({ name: 1 }).lean();
    const workLogs = await WorkLog.find().sort({ date: -1 }).limit(200).lean();
    return res.render('revisions/form', {
      title: 'Revizyon düzenle',
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
    revisionNumber: parseInt(b.revisionNumber, 10) || 1,
    title: b.title?.trim(),
    requestedBy: b.requestedBy?.trim(),
    topic: b.topic?.trim(),
    whatWasDone: b.whatWasDone?.trim(),
    status: b.status?.trim(),
  });
  await item.save();
  req.session.flash = { type: 'success', message: 'Güncellendi.' };
  res.redirect('/revisions');
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await Revision.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Silindi.' };
  res.redirect('/revisions');
});

module.exports = router;
