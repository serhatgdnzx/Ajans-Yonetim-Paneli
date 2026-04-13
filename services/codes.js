const Client = require('../models/Client');
const WorkLog = require('../models/WorkLog');
const Delivery = require('../models/Delivery');

async function nextCustomerCode() {
  const clients = await Client.find({ customerCode: { $regex: /^MST\d+$/i } })
    .select('customerCode')
    .lean();
  let max = 0;
  for (const c of clients) {
    const n = parseInt(String(c.customerCode).replace(/^MST/i, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `MST${String(max + 1).padStart(3, '0')}`;
}

async function nextWorkCode(customerCode) {
  if (!customerCode) return `UNKNOWN-IS${String(Date.now()).slice(-3)}`;
  const prefix = `${customerCode}-IS`;
  const logs = await WorkLog.find({ workCode: { $regex: new RegExp(`^${customerCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-IS\\d+$`, 'i') } })
    .select('workCode')
    .lean();
  let max = 0;
  for (const w of logs) {
    const part = String(w.workCode).split('-IS')[1];
    const n = parseInt(part, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${customerCode}-IS${String(max + 1).padStart(3, '0')}`;
}

async function nextDeliveryCode(customerCode) {
  if (!customerCode) return `TSLUNKNOWN${String(Date.now()).slice(-3)}`;
  const escaped = customerCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const deliveries = await Delivery.find({
    deliveryCode: { $regex: new RegExp(`^TSL${escaped}\\d{3}$`, 'i') },
  })
    .select('deliveryCode')
    .lean();
  let max = 0;
  const suffixLen = 3;
  for (const d of deliveries) {
    const code = String(d.deliveryCode);
    const num = parseInt(code.slice(-suffixLen), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `TSL${customerCode}${String(max + 1).padStart(3, '0')}`;
}

module.exports = { nextCustomerCode, nextWorkCode, nextDeliveryCode };
