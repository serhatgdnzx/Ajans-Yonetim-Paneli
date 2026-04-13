const express = require('express');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Task = require('../models/Task');
const {
  getDashboardMetrics,
  getIsTipiDagilimi,
  getGunlukIsAdedi,
  getKisiBasiIsSayisi,
  getTeslimatDurumDagilimi,
} = require('../services/statistics');

const router = express.Router();

router.get('/', async (req, res) => {
  const [
    metrics,
    isTipiDagilimi,
    gunlukIsAdedi,
    kisiBasiIs,
    teslimatDurum,
    projectActive,
    projectDone,
    taskCounts,
    recentProjects,
  ] = await Promise.all([
    getDashboardMetrics(),
    getIsTipiDagilimi(),
    getGunlukIsAdedi(30),
    getKisiBasiIsSayisi(5),
    getTeslimatDurumDagilimi(),
    Project.countDocuments({ status: 'devam_ediyor' }),
    Project.countDocuments({ status: 'bitti' }),
    Task.aggregate([{ $group: { _id: '$column', n: { $sum: 1 } } }]),
    Project.find()
      .populate('client', 'name company')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const tasksByCol = { yapilacak: 0, devam: 0, bitti: 0 };
  taskCounts.forEach((x) => {
    if (tasksByCol[x._id] !== undefined) tasksByCol[x._id] = x.n;
  });

  res.render('dashboard', {
    title: 'Panel',
    metrics,
    isTipiDagilimi,
    gunlukIsAdedi,
    kisiBasiIs,
    teslimatDurum,
    clientCount: metrics.toplam_musteri,
    projectActive,
    projectDone,
    tasksByCol,
    recentProjects,
  });
});

module.exports = router;
