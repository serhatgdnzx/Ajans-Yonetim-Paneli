const express = require('express');
const CallLog = require('../models/CallLog');
const Client = require('../models/Client');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await CallLog.find().populate('client', 'name customerCode').sort({ date: -1 }).limit(200).lean();
  res.render('calls/index', { title: 'CRM · Aramalar', items });
});

router.get('/yeni', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  res.render('calls/form', { title: 'Arama kaydı ekle', item: null, clients, error: null });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const clients = await Client.find().sort({ name: 1 }).lean();
  if (!b.client || !b.date) {
    return res.render('calls/form', {
      title: 'Arama kaydı ekle',
      item: b,
      clients,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  await CallLog.create({
    date: new Date(b.date),
    client: b.client,
    callerCallee: b.callerCallee?.trim(),
    subject: b.subject?.trim(),
    result: b.result?.trim(),
    responsiblePerson: b.responsiblePerson?.trim(),
    notes: b.notes?.trim(),
    callbackDate: b.callbackDate ? new Date(b.callbackDate) : undefined,
    status: b.status?.trim() || 'Bekliyor',
  });
  req.session.flash = { type: 'success', message: 'Arama kaydı eklendi.' };
  res.redirect('/calls');
});

router.get('/:id/duzenle', async (req, res) => {
  const item = await CallLog.findById(req.params.id).lean();
  if (!item) return res.redirect('/calls');
  const clients = await Client.find().sort({ name: 1 }).lean();
  res.render('calls/form', { title: 'Arama düzenle', item, clients, error: null });
});

router.put('/:id', async (req, res) => {
  const b = req.body;
  const item = await CallLog.findById(req.params.id);
  if (!item) return res.redirect('/calls');
  if (!b.client || !b.date) {
    const clients = await Client.find().sort({ name: 1 }).lean();
    return res.render('calls/form', {
      title: 'Arama düzenle',
      item: { ...item.toObject(), ...b },
      clients,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  Object.assign(item, {
    date: new Date(b.date),
    client: b.client,
    callerCallee: b.callerCallee?.trim(),
    subject: b.subject?.trim(),
    result: b.result?.trim(),
    responsiblePerson: b.responsiblePerson?.trim(),
    notes: b.notes?.trim(),
    callbackDate: b.callbackDate ? new Date(b.callbackDate) : null,
    status: b.status?.trim(),
  });
  await item.save();
  req.session.flash = { type: 'success', message: 'Güncellendi.' };
  res.redirect('/calls');
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await CallLog.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Silindi.' };
  res.redirect('/calls');
});

module.exports = router;
