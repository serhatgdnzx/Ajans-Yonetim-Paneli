const path = require('path');
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const Delivery = require('../models/Delivery');
const SocialPost = require('../models/SocialPost');
const Revision = require('../models/Revision');
const CallLog = require('../models/CallLog');
const { nextCustomerCode } = require('../services/codes');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      path.extname(file.originalname).toLowerCase() === '.xlsx';
    cb(null, ok);
  },
});

function sheetFromRows(workbook, name, headers, rows) {
  const ws = workbook.addWorksheet(name);
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
}

router.get('/', (req, res) => {
  res.render('excel/index', { title: 'Excel içe / dışa aktar', error: null, result: null });
});

router.get('/export', async (req, res) => {
  const [clients, workLogs, deliveries, social, revisions, calls] = await Promise.all([
    Client.find().lean(),
    WorkLog.find().populate('client', 'name').lean(),
    Delivery.find().populate('client', 'name').populate('workLog', 'workCode').lean(),
    SocialPost.find().populate('client', 'name').lean(),
    Revision.find().populate('client', 'name').lean(),
    CallLog.find().populate('client', 'name').lean(),
  ]);

  const wb = new ExcelJS.Workbook();
  sheetFromRows(
    wb,
    'Müşteriler',
    ['Kod', 'Ad', 'Şirket', 'Sektör', 'Sözleşme başlangıç', 'Aylık ücret', 'İlgili kişi', 'E-posta', 'Telefon', 'Notlar'],
    clients.map((c) => [
      c.customerCode || '',
      c.name,
      c.company || '',
      c.sector || '',
      c.contractStart ? new Date(c.contractStart).toISOString().slice(0, 10) : '',
      c.monthlyFee ?? '',
      c.contactPerson || '',
      c.email || '',
      c.phone || '',
      c.notes || '',
    ])
  );
  sheetFromRows(
    wb,
    'İş günlüğü',
    ['Kod', 'Tarih', 'Müşteri', 'Proje', 'Aktivite', 'Süre dk', 'Sorumlu', 'Durum'],
    workLogs.map((w) => [
      w.workCode || '',
      w.date ? new Date(w.date).toISOString().slice(0, 10) : '',
      w.client?.name || '',
      w.projectName || '',
      w.activityType || '',
      w.durationMinutes ?? '',
      w.responsiblePerson || '',
      w.status || '',
    ])
  );
  sheetFromRows(
    wb,
    'Teslimatlar',
    ['Kod', 'Müşteri', 'İş kodu', 'Başlık', 'Tür', 'Durum', 'Teslim tarihi'],
    deliveries.map((d) => [
      d.deliveryCode || '',
      d.client?.name || '',
      d.workLog?.workCode || '',
      d.title || '',
      d.deliveryType || '',
      d.status || '',
      d.deliveryDate ? new Date(d.deliveryDate).toISOString().slice(0, 10) : '',
    ])
  );
  sheetFromRows(
    wb,
    'Sosyal medya',
    ['Tarih', 'Müşteri', 'Platform', 'Başlık', 'Gönderi türü', 'Durum'],
    social.map((s) => [
      s.date ? new Date(s.date).toISOString().slice(0, 10) : '',
      s.client?.name || '',
      s.platform || '',
      s.contentTitle || '',
      s.postType || '',
      s.status || '',
    ])
  );
  sheetFromRows(
    wb,
    'Revizyonlar',
    ['Tarih', 'Müşteri', 'No', 'Başlık', 'Durum'],
    revisions.map((r) => [
      r.date ? new Date(r.date).toISOString().slice(0, 10) : '',
      r.client?.name || '',
      r.revisionNumber,
      r.title || '',
      r.status || '',
    ])
  );
  sheetFromRows(
    wb,
    'Aramalar',
    ['Tarih', 'Müşteri', 'Arayan/Aranan', 'Konu', 'Sonuç', 'Durum'],
    calls.map((a) => [
      a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
      a.client?.name || '',
      a.callerCallee || '',
      a.subject || '',
      a.result || '',
      a.status || '',
    ])
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="ajans-export.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) {
    return res.render('excel/index', {
      title: 'Excel içe / dışa aktar',
      error: 'Geçerli bir .xlsx dosyası seçin.',
      result: null,
    });
  }
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) {
      return res.render('excel/index', {
        title: 'Excel içe / dışa aktar',
        error: 'Çalışma sayfası bulunamadı.',
        result: null,
      });
    }
    const rows = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const vals = row.values.slice(1);
      rows.push(vals);
    });
    let added = 0;
    for (const vals of rows) {
      const c0 = vals[0] != null ? String(vals[0]).trim() : '';
      const c1 = vals[1] != null ? String(vals[1]).trim() : '';
      const name = c1 || c0;
      if (!name || /^kod$/i.test(c0) || /^ad$/i.test(name)) continue;
      let code = /^MST\d+/i.test(c0) ? c0.toUpperCase() : await nextCustomerCode();
      if (await Client.findOne({ customerCode: code })) code = await nextCustomerCode();
      if (await Client.findOne({ name })) continue;
      try {
        await Client.create({
          customerCode: code,
          name,
          company: vals[2] != null ? String(vals[2]).trim() : '',
          sector: vals[3] != null ? String(vals[3]).trim() : '',
          contractStart: vals[4] ? new Date(vals[4]) : undefined,
          monthlyFee: parseFloat(vals[5]) || 0,
          contactPerson: vals[6] != null ? String(vals[6]).trim() : '',
          email: vals[7] != null ? String(vals[7]).trim().toLowerCase() : '',
          phone: vals[8] != null ? String(vals[8]).trim() : '',
          notes: vals[9] != null ? String(vals[9]).trim() : '',
          createdBy: req.session.userId,
        });
        added++;
      } catch (err) {
        continue;
      }
    }
    req.session.flash = { type: 'success', message: `${added} müşteri içe aktarıldı.` };
    res.redirect('/clients');
  } catch (e) {
    res.render('excel/index', {
      title: 'Excel içe / dışa aktar',
      error: 'Dosya okunamadı: ' + (e.message || 'bilinmeyen'),
      result: null,
    });
  }
});

module.exports = router;
