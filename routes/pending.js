const express = require('express');
const WorkLog = require('../models/WorkLog');
const Delivery = require('../models/Delivery');

const router = express.Router();

router.get('/', async (req, res) => {
  const withDelivery = await Delivery.distinct('workLog');
  const ids = withDelivery.filter(Boolean);
  const items = await WorkLog.find({ _id: { $nin: ids } })
    .populate('client', 'name customerCode')
    .sort({ date: -1 })
    .limit(100)
    .lean();
  res.render('pending/index', { title: 'Bekleyen işler', items });
});

module.exports = router;
