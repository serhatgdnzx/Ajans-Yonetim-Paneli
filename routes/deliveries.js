const express = require('express');
const Delivery = require('../models/Delivery');
const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const { nextDeliveryCode } = require('../services/codes');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await Delivery.find()
    .populate('client', 'name customerCode')
    .populate('workLog', 'workCode projectName')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  res.render('deliveries/index', { title: 'Teslimatlar', items });
});

router.get('/yeni', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().populate('client', 'name').sort({ date: -1 }).limit(300).lean();
  if (!workLogs.length) {
    req.session.flash = { type: 'info', message: 'Önce iş günlüğüne kayıt ekleyin.' };
    return res.redirect('/work-logs/yeni');
  }
  res.render('deliveries/form', { title: 'Teslimat ekle', item: null, clients, workLogs, error: null });
});

router.post('/', async (req, res) => {
  const body = req.body;
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().populate('client', 'name').sort({ date: -1 }).limit(300).lean();
  if (!body.workLog || !body.client) {
    return res.render('deliveries/form', {
      title: 'Teslimat ekle',
      item: body,
      clients,
      workLogs,
      error: 'İş günlüğü kaydı ve müşteri zorunlu.',
    });
  }
  const client = await Client.findById(body.client);
  if (!client) {
    return res.render('deliveries/form', {
      title: 'Teslimat ekle',
      item: body,
      clients,
      workLogs,
      error: 'Müşteri bulunamadı.',
    });
  }
  let cc = client.customerCode;
  if (!cc) {
    const { nextCustomerCode } = require('../services/codes');
    cc = await nextCustomerCode();
    client.customerCode = cc;
    await client.save();
  }
  const deliveryCode = await nextDeliveryCode(cc);
  await Delivery.create({
    deliveryCode,
    client: body.client,
    workLog: body.workLog,
    activityType: body.activityType?.trim(),
    projectName: body.projectName?.trim(),
    deliveryType: body.deliveryType?.trim(),
    title: body.title?.trim(),
    responsiblePerson: body.responsiblePerson?.trim(),
    createdOn: body.createdOn ? new Date(body.createdOn) : new Date(),
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
    status: body.status?.trim() || 'Hazırlanıyor',
    description: body.description?.trim(),
    platform: body.platform?.trim(),
    postType: body.postType?.trim(),
    interaction: body.interaction ? parseInt(body.interaction, 10) : undefined,
    views: body.views ? parseInt(body.views, 10) : undefined,
    likes: body.likes ? parseInt(body.likes, 10) : undefined,
    comments: body.comments ? parseInt(body.comments, 10) : undefined,
    shares: body.shares ? parseInt(body.shares, 10) : undefined,
  });
  req.session.flash = { type: 'success', message: `Teslimat oluşturuldu. Kod: ${deliveryCode}` };
  res.redirect('/deliveries');
});

router.get('/:id/duzenle', async (req, res) => {
  const item = await Delivery.findById(req.params.id).lean();
  if (!item) return res.redirect('/deliveries');
  const clients = await Client.find().sort({ name: 1 }).lean();
  const workLogs = await WorkLog.find().populate('client', 'name').sort({ date: -1 }).limit(300).lean();
  res.render('deliveries/form', { title: 'Teslimat düzenle', item, clients, workLogs, error: null });
});

router.put('/:id', async (req, res) => {
  const body = req.body;
  const item = await Delivery.findById(req.params.id);
  if (!item) return res.redirect('/deliveries');
  if (!body.workLog || !body.client) {
    const clients = await Client.find().sort({ name: 1 }).lean();
    const workLogs = await WorkLog.find().populate('client', 'name').sort({ date: -1 }).limit(300).lean();
    return res.render('deliveries/form', {
      title: 'Teslimat düzenle',
      item: { ...item.toObject(), ...body },
      clients,
      workLogs,
      error: 'İş ve müşteri zorunlu.',
    });
  }
  Object.assign(item, {
    client: body.client,
    workLog: body.workLog,
    activityType: body.activityType?.trim(),
    projectName: body.projectName?.trim(),
    deliveryType: body.deliveryType?.trim(),
    title: body.title?.trim(),
    responsiblePerson: body.responsiblePerson?.trim(),
    createdOn: body.createdOn ? new Date(body.createdOn) : item.createdOn,
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
    status: body.status?.trim(),
    description: body.description?.trim(),
    platform: body.platform?.trim(),
    postType: body.postType?.trim(),
    interaction: body.interaction ? parseInt(body.interaction, 10) : null,
    views: body.views ? parseInt(body.views, 10) : null,
    likes: body.likes ? parseInt(body.likes, 10) : null,
    comments: body.comments ? parseInt(body.comments, 10) : null,
    shares: body.shares ? parseInt(body.shares, 10) : null,
  });
  await item.save();
  req.session.flash = { type: 'success', message: 'Teslimat güncellendi.' };
  res.redirect('/deliveries');
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await Delivery.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Teslimat silindi.' };
  res.redirect('/deliveries');
});

module.exports = router;
