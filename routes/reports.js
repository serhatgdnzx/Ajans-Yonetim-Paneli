const express = require('express');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

router.get('/', async (req, res) => {
  const [clients, projectsByStatus, tasksByColumn, projectList] = await Promise.all([
    Client.countDocuments(),
    Project.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$column', n: { $sum: 1 } } }]),
    Project.find()
      .populate('client', 'name')
      .select('title status createdAt')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
  ]);
  const statusMap = { devam_ediyor: 0, bitti: 0 };
  projectsByStatus.forEach((x) => {
    if (statusMap[x._id] !== undefined) statusMap[x._id] = x.n;
  });
  const colMap = { yapilacak: 0, devam: 0, bitti: 0 };
  tasksByColumn.forEach((x) => {
    if (colMap[x._id] !== undefined) colMap[x._id] = x.n;
  });
  const totalTasks = Object.values(colMap).reduce((a, b) => a + b, 0);
  const doneTasks = colMap.bitti;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  res.render('reports', {
    title: 'Raporlar',
    clients,
    statusMap,
    colMap,
    totalTasks,
    completionRate,
    projectList,
  });
});

module.exports = router;
