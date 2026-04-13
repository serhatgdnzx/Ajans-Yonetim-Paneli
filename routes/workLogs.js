const express = require('express');
const WorkLog = require('../models/WorkLog');
const Client = require('../models/Client');
const { nextWorkCode } = require('../services/codes');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await WorkLog.find().populate('client', 'name customerCode').sort({ date: -1 }).limit(200).lean();
  res.render('workLogs/index', { title: 'İş günlüğü', items });
});

router.get('/yeni', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  if (!clients.length) {
    req.session.flash = { type: 'info', message: 'Önce müşteri ekleyin.' };
    return res.redirect('/clients/yeni');
  }
  res.render('workLogs/form', { title: 'İş ekle', item: null, clients, error: null });
});

router.post('/', async (req, res) => {
  const {
    client: clientId,
    date,
    projectName,
    activityType,
    description,
    responsiblePerson,
    durationMinutes,
    tags,
    status,
    whatWasDone,
  } = req.body;
  const clients = await Client.find().sort({ name: 1 }).lean();
  if (!clientId || !date) {
    return res.render('workLogs/form', {
      title: 'İş ekle',
      item: req.body,
      clients,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  const client = await Client.findById(clientId);
  if (!client) {
    return res.render('workLogs/form', {
      title: 'İş ekle',
      item: req.body,
      clients,
      error: 'Müşteri bulunamadı.',
    });
  }
  let code = client.customerCode;
  if (!code) {
    const { nextCustomerCode } = require('../services/codes');
    code = await nextCustomerCode();
    client.customerCode = code;
    await client.save();
  }
  const workCode = await nextWorkCode(code);
  await WorkLog.create({
    workCode,
    date: new Date(date),
    client: clientId,
    projectName: projectName?.trim(),
    activityType: activityType?.trim(),
    description: description?.trim(),
    responsiblePerson: responsiblePerson?.trim(),
    durationMinutes: parseInt(durationMinutes, 10) || 0,
    tags: tags?.trim(),
    status: status?.trim() || 'Bekliyor',
    whatWasDone: whatWasDone?.trim(),
  });
  req.session.flash = { type: 'success', message: `İş kaydedildi. Kod: ${workCode}` };
  res.redirect('/work-logs');
});

router.get('/:id/duzenle', async (req, res) => {
  const item = await WorkLog.findById(req.params.id).lean();
  if (!item) return res.redirect('/work-logs');
  const clients = await Client.find().sort({ name: 1 }).lean();
  res.render('workLogs/form', { title: 'İş düzenle', item, clients, error: null });
});

router.put('/:id', async (req, res) => {
  const {
    client: clientId,
    date,
    projectName,
    activityType,
    description,
    responsiblePerson,
    durationMinutes,
    tags,
    status,
    revisionCount,
    whatWasDone,
  } = req.body;
  const item = await WorkLog.findById(req.params.id);
  if (!item) return res.redirect('/work-logs');
  if (!clientId || !date) {
    const clients = await Client.find().sort({ name: 1 }).lean();
    return res.render('workLogs/form', {
      title: 'İş düzenle',
      item: { ...item.toObject(), ...req.body },
      clients,
      error: 'Müşteri ve tarih zorunlu.',
    });
  }
  Object.assign(item, {
    date: new Date(date),
    client: clientId,
    projectName: projectName?.trim(),
    activityType: activityType?.trim(),
    description: description?.trim(),
    responsiblePerson: responsiblePerson?.trim(),
    durationMinutes: parseInt(durationMinutes, 10) || 0,
    tags: tags?.trim(),
    status: status?.trim() || 'Bekliyor',
    revisionCount: parseInt(revisionCount, 10) || 0,
    whatWasDone: whatWasDone?.trim(),
  });
  await item.save();
  req.session.flash = { type: 'success', message: 'İş güncellendi.' };
  res.redirect('/work-logs');
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await WorkLog.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'İş silindi.' };
  res.redirect('/work-logs');
});

module.exports = router;
