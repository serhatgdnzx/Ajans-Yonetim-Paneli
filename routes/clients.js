const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const ClientMessage = require('../models/ClientMessage');
const Project = require('../models/Project');
const Task = require('../models/Task');
const WorkLog = require('../models/WorkLog');
const Delivery = require('../models/Delivery');
const SocialPost = require('../models/SocialPost');
const Revision = require('../models/Revision');
const CallLog = require('../models/CallLog');
const { requireAdmin } = require('../middleware/auth');
const { nextCustomerCode } = require('../services/codes');

const router = express.Router();

router.get('/', async (req, res) => {
  const clients = await Client.find().sort({ name: 1 }).lean();
  res.render('clients/index', { title: 'Müşteriler', clients });
});

router.get('/yeni', (req, res) => {
  res.render('clients/form', { title: 'Müşteri ekle', client: null, error: null });
});

router.post('/', async (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) {
    return res.render('clients/form', {
      title: 'Müşteri ekle',
      client: b,
      error: 'İsim zorunludur.',
    });
  }
  const portalEnabled = b.portalEnabled === 'on' || b.portalEnabled === 'true';
  const portalEmail = String(b.portalEmail || '')
    .toLowerCase()
    .trim();
  if (portalEnabled) {
    if (!portalEmail) {
      return res.render('clients/form', {
        title: 'Müşteri ekle',
        client: b,
        error: 'Portal açıksa portal e-postası zorunludur.',
      });
    }
    if (!b.portalPassword?.trim() || String(b.portalPassword).length < 6) {
      return res.render('clients/form', {
        title: 'Müşteri ekle',
        client: b,
        error: 'Portal şifresi en az 6 karakter olmalı.',
      });
    }
  }
  try {
    const customerCode = await nextCustomerCode();
    const doc = {
      customerCode,
      name: b.name.trim(),
      company: b.company?.trim(),
      sector: b.sector?.trim(),
      contractStart: b.contractStart ? new Date(b.contractStart) : undefined,
      monthlyFee: parseFloat(b.monthlyFee) || 0,
      contactPerson: b.contactPerson?.trim(),
      email: b.email?.trim(),
      phone: b.phone?.trim(),
      notes: b.notes?.trim(),
      createdBy: req.session.userId,
      portalEnabled: !!portalEnabled,
    };
    if (portalEnabled) {
      doc.portalEmail = portalEmail;
      doc.portalPasswordHash = await bcrypt.hash(String(b.portalPassword).trim(), 10);
    }
    await Client.create(doc);
    req.session.flash = { type: 'success', message: `Müşteri kaydedildi. Kod: ${customerCode}` };
    res.redirect('/clients');
  } catch (e) {
    const msg = e.code === 11000 ? 'Bu portal e-postası başka bir müşteride kullanılıyor.' : 'Kayıt başarısız.';
    res.render('clients/form', { title: 'Müşteri ekle', client: b, error: msg });
  }
});

router.get('/:id/detay', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/clients');
  const client = await Client.findById(req.params.id).lean();
  if (!client) return res.redirect('/clients');
  const cid = client._id;
  const [workLogs, deliveries, social, revisions, calls, onaydaBekleyen, clientMessages] = await Promise.all([
    WorkLog.find({ client: cid }).sort({ date: -1 }).limit(50).lean(),
    Delivery.find({ client: cid }).populate('workLog', 'workCode').sort({ deliveryDate: -1 }).limit(50).lean(),
    SocialPost.find({ client: cid }).sort({ date: -1 }).limit(50).lean(),
    Revision.find({ client: cid }).sort({ date: -1 }).limit(50).lean(),
    CallLog.find({ client: cid }).sort({ date: -1 }).limit(50).lean(),
    WorkLog.find({ client: cid, status: 'Onayda' }).sort({ date: -1 }).limit(20).lean(),
    ClientMessage.find({ client: cid }).sort({ createdAt: -1 }).limit(30).populate('project', 'title').lean(),
  ]);
  await ClientMessage.updateMany({ client: cid, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  const toplamDakika = await WorkLog.aggregate([
    { $match: { client: new mongoose.Types.ObjectId(cid) } },
    { $group: { _id: null, t: { $sum: { $ifNull: ['$durationMinutes', 0] } } } },
  ]);
  const dk = toplamDakika[0]?.t || 0;
  const onaylananTeslimat = deliveries.filter((t) =>
    ['Tamamlandı', 'Teslim Edildi', 'Onaylandı'].includes(t.status)
  ).length;
  const devamEdenTeslimat = deliveries.filter((t) => t.status === 'Hazırlanıyor').length;
  res.render('clients/detail', {
    title: client.name,
    client,
    workLogs,
    deliveries,
    social,
    revisions,
    calls,
    onaydaBekleyen,
    toplamSaat: Math.round((dk / 60) * 10) / 10,
    onaylananTeslimat,
    devamEdenTeslimat,
    toplamIs: workLogs.length,
    toplamTeslimat: deliveries.length,
    sosyalMedyaTeslimat: deliveries.filter((t) => t.deliveryType === 'Sosyal Medya').length,
    clientMessages,
  });
});

router.get('/:id/rapor', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/clients');
  const client = await Client.findById(req.params.id).lean();
  if (!client) return res.redirect('/clients');
  const filtre = req.query.filtre || 'tumu';
  const cid = client._id;
  const today = new Date();
  let start = null;
  let end = null;
  if (filtre === 'ay') start = new Date(today.getFullYear(), today.getMonth(), 1);
  else if (filtre === 'yil') start = new Date(today.getFullYear(), 0, 1);
  else if (filtre === '6ay') {
    start = new Date(today);
    start.setDate(start.getDate() - 180);
  } else if (filtre === 'ozel' && req.query.baslangic && req.query.bitis) {
    start = new Date(req.query.baslangic);
    end = new Date(req.query.bitis);
  }
  const q = { client: cid };
  const qDate = {};
  if (start) qDate.$gte = start;
  if (end) qDate.$lte = end;
  const wq = { ...q };
  const dq = { ...q };
  const sq = { ...q };
  const rq = { ...q };
  if (Object.keys(qDate).length) {
    wq.date = qDate;
    dq.deliveryDate = qDate;
    sq.date = qDate;
    rq.date = qDate;
  }
  const [workLogs, deliveries, social, revisions, tumIsler] = await Promise.all([
    WorkLog.find(wq).sort({ date: -1 }).lean(),
    Delivery.find(dq).sort({ deliveryDate: -1 }).lean(),
    SocialPost.find(sq).sort({ date: -1 }).lean(),
    Revision.find(rq).sort({ date: -1 }).lean(),
    WorkLog.find({ client: cid }).sort({ date: -1 }).lean(),
  ]);
  const match = { client: new mongoose.Types.ObjectId(cid) };
  if (start || end) {
    match.date = {};
    if (start) match.date.$gte = start;
    if (end) match.date.$lte = end;
  }
  const dakAgg = await WorkLog.aggregate([
    { $match: match },
    { $group: { _id: null, t: { $sum: { $ifNull: ['$durationMinutes', 0] } } } },
  ]);
  const dk = dakAgg[0]?.t || 0;
  const onaylananTeslimat = deliveries.filter((t) =>
    ['Tamamlandı', 'Teslim Edildi', 'Onaylandı'].includes(t.status)
  ).length;
  const devamEdenTeslimat = deliveries.filter((t) => t.status === 'Hazırlanıyor').length;
  res.render('clients/report', {
    title: 'Rapor · ' + client.name,
    client,
    filtre,
    workLogs,
    deliveries,
    social,
    revisions,
    tumIsler,
    toplamSaat: Math.round((dk / 60) * 10) / 10,
    onaylananTeslimat,
    devamEdenTeslimat,
    toplamIs: workLogs.length,
    toplamTeslimat: deliveries.length,
    sosyalMedyaTeslimat: deliveries.filter((t) => t.deliveryType === 'Sosyal Medya').length,
    toplamRevizyon: revisions.length,
  });
});

router.get('/:id/duzenle', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/clients');
  const client = await Client.findById(req.params.id).lean();
  if (!client) return res.redirect('/clients');
  res.render('clients/form', { title: 'Müşteri düzenle', client, error: null });
});

router.put('/:id', async (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) {
    const client = await Client.findById(req.params.id).lean();
    return res.render('clients/form', {
      title: 'Müşteri düzenle',
      client: { ...client, ...b },
      error: 'İsim zorunludur.',
    });
  }
  const portalEnabled = b.portalEnabled === 'on' || b.portalEnabled === 'true';
  const portalEmail = String(b.portalEmail || '')
    .toLowerCase()
    .trim();
  if (portalEnabled) {
    if (!portalEmail) {
      const client = await Client.findById(req.params.id).lean();
      return res.render('clients/form', {
        title: 'Müşteri düzenle',
        client: { ...client, ...b },
        error: 'Portal açıksa portal e-postası zorunludur.',
      });
    }
    const existing = await Client.findById(req.params.id).select('+portalPasswordHash').lean();
    if (!existing?.portalPasswordHash && (!b.portalPassword?.trim() || String(b.portalPassword).length < 6)) {
      const client = await Client.findById(req.params.id).lean();
      return res.render('clients/form', {
        title: 'Müşteri düzenle',
        client: { ...client, ...b },
        error: 'İlk kez portal açılıyorsa en az 6 karakterlik şifre girin.',
      });
    }
  }
  const base = {
    name: b.name.trim(),
    company: b.company?.trim(),
    sector: b.sector?.trim(),
    contractStart: b.contractStart ? new Date(b.contractStart) : null,
    monthlyFee: parseFloat(b.monthlyFee) || 0,
    contactPerson: b.contactPerson?.trim(),
    email: b.email?.trim(),
    phone: b.phone?.trim(),
    notes: b.notes?.trim(),
    portalEnabled: !!portalEnabled,
  };
  try {
    if (portalEnabled) {
      base.portalEmail = portalEmail;
      if (b.portalPassword?.trim()) {
        if (String(b.portalPassword).length < 6) {
          const client = await Client.findById(req.params.id).lean();
          return res.render('clients/form', {
            title: 'Müşteri düzenle',
            client: { ...client, ...b },
            error: 'Portal şifresi en az 6 karakter olmalı.',
          });
        }
        base.portalPasswordHash = await bcrypt.hash(String(b.portalPassword).trim(), 10);
      }
      await Client.findByIdAndUpdate(req.params.id, { $set: base });
    } else {
      await Client.findByIdAndUpdate(req.params.id, {
        $set: base,
        $unset: { portalEmail: 1, portalPasswordHash: 1 },
      });
    }
    req.session.flash = { type: 'success', message: 'Güncellendi.' };
    res.redirect('/clients/' + req.params.id + '/detay');
  } catch (e) {
    const client = await Client.findById(req.params.id).lean();
    const msg = e.code === 11000 ? 'Bu portal e-postası başka bir müşteride kullanılıyor.' : 'Güncelleme başarısız.';
    res.render('clients/form', { title: 'Müşteri düzenle', client: { ...client, ...b }, error: msg });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const cid = req.params.id;
  const projectIds = (await Project.find({ client: cid }).select('_id').lean()).map((p) => p._id);
  await Task.deleteMany({ project: { $in: projectIds } });
  await Project.deleteMany({ client: cid });
  const wids = (await WorkLog.find({ client: cid }).select('_id').lean()).map((w) => w._id);
  await Delivery.deleteMany({ $or: [{ client: cid }, { workLog: { $in: wids } }] });
  await Revision.deleteMany({ $or: [{ client: cid }, { workLog: { $in: wids } }] });
  await SocialPost.deleteMany({ $or: [{ client: cid }, { workLog: { $in: wids } }] });
  await CallLog.deleteMany({ client: cid });
  await WorkLog.deleteMany({ client: cid });
  await ClientMessage.deleteMany({ client: cid });
  await Client.findByIdAndDelete(cid);
  req.session.flash = { type: 'success', message: 'Müşteri ve ilişkili tüm kayıtlar silindi.' };
  res.redirect('/clients');
});

module.exports = router;
