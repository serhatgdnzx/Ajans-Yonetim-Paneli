const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');

const router = express.Router();

router.post('/project/:projectId', async (req, res) => {
  const { title, description, column, assignee } = req.body;
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.redirect('/projects');
  if (!title?.trim()) {
    req.session.flash = { type: 'error', message: 'Görev başlığı gerekli.' };
    return res.redirect(`/projects/${req.params.projectId}`);
  }
  const maxOrder = await Task.findOne({ project: project._id, column: column || 'yapilacak' })
    .sort({ order: -1 })
    .select('order')
    .lean();
  const order = (maxOrder?.order ?? -1) + 1;
  await Task.create({
    title: title.trim(),
    description: description?.trim(),
    column: ['yapilacak', 'devam', 'bitti'].includes(column) ? column : 'yapilacak',
    order,
    project: project._id,
    assignee: assignee || undefined,
  });
  req.session.flash = { type: 'success', message: 'Görev eklendi.' };
  res.redirect(`/projects/${req.params.projectId}`);
});

router.patch('/:id/move', express.json(), async (req, res) => {
  const { column, order } = req.body;
  if (!['yapilacak', 'devam', 'bitti'].includes(column)) {
    return res.status(400).json({ ok: false });
  }
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ ok: false });
  task.column = column;
  if (typeof order === 'number') task.order = order;
  await task.save();
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.redirect('/projects');
  const pid = task.project.toString();
  await Task.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Görev silindi.' };
  res.redirect(`/projects/${pid}`);
});

module.exports = router;
