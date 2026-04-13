const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const Delivery = require('../models/Delivery');
const SocialPost = require('../models/SocialPost');

async function getDashboardMetrics() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    toplamMusteri,
    buAyIs,
    onaylananTeslimat,
    toplamDakikaAgg,
    reelsSayisi,
    bekleyenTeslimat,
    allWorkIds,
    teslimatliIsIds,
    buAyDakikaAgg,
  ] = await Promise.all([
    Client.countDocuments(),
    WorkLog.countDocuments({ date: { $gte: monthStart } }),
    Delivery.countDocuments({ status: 'Onaylandı' }),
    WorkLog.aggregate([{ $group: { _id: null, t: { $sum: { $ifNull: ['$durationMinutes', 0] } } } }]),
    SocialPost.countDocuments({ postType: { $regex: /^reels$/i } }),
    Delivery.countDocuments({
      status: { $in: ['Hazırlanıyor', 'Bekliyor', 'Revizede', 'Devam Ediyor'] },
    }),
    WorkLog.find().select('_id').lean(),
    Delivery.distinct('workLog'),
    WorkLog.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, t: { $sum: { $ifNull: ['$durationMinutes', 0] } } } },
    ]),
  ]);

  const withDel = new Set((teslimatliIsIds || []).map((id) => id.toString()));
  const bekleyenIsler = allWorkIds.filter((w) => !withDel.has(w._id.toString())).length;

  const toplamDakika = toplamDakikaAgg[0]?.t || 0;
  const buAyDakika = buAyDakikaAgg[0]?.t || 0;

  return {
    toplam_musteri: toplamMusteri,
    bu_ay_is: buAyIs,
    onaylanan_teslimat: onaylananTeslimat,
    toplam_saat: Math.round((toplamDakika / 60) * 10) / 10,
    reels_sayisi: reelsSayisi,
    bekleyen_teslimat: bekleyenTeslimat,
    bekleyen_isler: bekleyenIsler,
    bu_ay_saat: Math.round((buAyDakika / 60) * 10) / 10,
  };
}

async function getIsTipiDagilimi() {
  const rows = await WorkLog.aggregate([
    { $match: { activityType: { $nin: [null, ''] } } },
    { $group: { _id: '$activityType', adet: { $sum: 1 } } },
  ]);
  const out = {};
  rows.forEach((r) => {
    if (r._id) out[r._id] = r.adet;
  });
  return out;
}

async function getGunlukIsAdedi(days = 30) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const rows = await WorkLog.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$date' },
        },
        adet: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const out = {};
  rows.forEach((r) => {
    out[r._id] = r.adet;
  });
  return out;
}

async function getKisiBasiIsSayisi(limit = 5) {
  const rows = await WorkLog.aggregate([
    { $match: { responsiblePerson: { $nin: [null, ''] } } },
    { $group: { _id: '$responsiblePerson', adet: { $sum: 1 } } },
    { $sort: { adet: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => [r._id, r.adet]);
}

async function getTeslimatDurumDagilimi() {
  const rows = await Delivery.aggregate([
    { $match: { status: { $nin: [null, ''] } } },
    { $group: { _id: '$status', adet: { $sum: 1 } } },
  ]);
  const out = {};
  rows.forEach((r) => {
    if (r._id) out[r._id] = r.adet;
  });
  return out;
}

module.exports = {
  getDashboardMetrics,
  getIsTipiDagilimi,
  getGunlukIsAdedi,
  getKisiBasiIsSayisi,
  getTeslimatDurumDagilimi,
};
