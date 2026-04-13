const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Task = require('../models/Task');
const User = require('../models/User');
const ClientMessage = require('../models/ClientMessage');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const COLUMNS = [
  { key: 'yapilacak', label: 'Yapılacak' },
  { key: 'devam', label: 'Devam ediyor' },
  { key: 'bitti', label: 'Bitti' },
];

router.get('/', async (req, res) => {
  const projects = await Project.find()
    .populate('client', 'name company')
    .sort({ updatedAt: -1 })
    .lean();
  res.render('projects/index', { title: 'Projeler', projects });
});

router.get('/yeni', async (req, res) => {
  const [clients, users] = await Promise.all([
    Client.find().sort({ name: 1 }).lean(),
    User.find().select('name email').sort({ name: 1 }).lean(),
  ]);
  if (!clients.length) {
    req.session.flash = { type: 'error', message: 'Önce en az bir müşteri ekleyin.' };
    return res.redirect('/clients/yeni');
  }
  res.render('projects/form', { title: 'Proje ekle', project: null, clients, users, error: null });
});

router.post('/', async (req, res) => {
  const { title, description, status, client, deadline, owner } = req.body;
  if (!title?.trim() || !client) {
    const [clients, users] = await Promise.all([
      Client.find().sort({ name: 1 }).lean(),
      User.find().select('name email').sort({ name: 1 }).lean(),
    ]);
    return res.render('projects/form', {
      title: 'Proje ekle',
      project: req.body,
      clients,
      users,
      error: 'Başlık ve müşteri zorunlu.',
    });
  }
  const ownerId = owner && mongoose.isValidObjectId(owner) ? owner : req.session.userId;
  await Project.create({
    title: title.trim(),
    description: description?.trim(),
    status: status === 'bitti' ? 'bitti' : 'devam_ediyor',
    client,
    owner: ownerId,
    deadline: deadline ? new Date(deadline) : undefined,
  });
  req.session.flash = { type: 'success', message: 'Proje oluşturuldu.' };
  res.redirect('/projects');
});

router.get('/:id', async (req, res) => {
  const project = await Project.findById(req.params.id).populate('client').populate('owner', 'name email phone').lean();
  if (!project) return res.redirect('/projects');
  const tasks = await Task.find({ project: project._id }).sort({ order: 1, createdAt: 1 }).populate('assignee', 'name').lean();
  const users = await User.find().select('name').sort({ name: 1 }).lean();
  const board = {
    yapilacak: tasks.filter((t) => t.column === 'yapilacak'),
    devam: tasks.filter((t) => t.column === 'devam'),
    bitti: tasks.filter((t) => t.column === 'bitti'),
  };
  res.render('projects/detail', {
    title: project.title,
    project,
    board,
    columns: COLUMNS,
    users,
    error: null,
  });
});

router.get('/:id/duzenle', async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) return res.redirect('/projects');
  const [clients, users] = await Promise.all([
    Client.find().sort({ name: 1 }).lean(),
    User.find().select('name email').sort({ name: 1 }).lean(),
  ]);
  res.render('projects/form', { title: 'Proje düzenle', project, clients, users, error: null });
});

router.put('/:id', async (req, res) => {
  const { title, description, status, client, deadline, owner } = req.body;
  if (!title?.trim() || !client) {
    const project = await Project.findById(req.params.id).lean();
    const [clients, users] = await Promise.all([
      Client.find().sort({ name: 1 }).lean(),
      User.find().select('name email').sort({ name: 1 }).lean(),
    ]);
    return res.render('projects/form', {
      title: 'Proje düzenle',
      project: { ...project, ...req.body },
      clients,
      users,
      error: 'Başlık ve müşteri zorunlu.',
    });
  }
  const ownerId = owner && mongoose.isValidObjectId(owner) ? owner : undefined;
  const update = {
    title: title.trim(),
    description: description?.trim(),
    status: status === 'bitti' ? 'bitti' : 'devam_ediyor',
    client,
    deadline: deadline ? new Date(deadline) : null,
  };
  if (ownerId) update.owner = ownerId;
  await Project.findByIdAndUpdate(req.params.id, update);
  req.session.flash = { type: 'success', message: 'Proje güncellendi.' };
  res.redirect(`/projects/${req.params.id}`);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await ClientMessage.deleteMany({ project: req.params.id });
  await Task.deleteMany({ project: req.params.id });
  await Project.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Proje ve görevleri silindi.' };
  res.redirect('/projects');
});

module.exports = router;
