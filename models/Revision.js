const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    workLog: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkLog' },
    revisionNumber: { type: Number, default: 1 },
    title: { type: String, trim: true },
    requestedBy: { type: String, trim: true },
    topic: { type: String, trim: true },
    whatWasDone: { type: String, trim: true },
    status: { type: String, default: 'Bekliyor', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Revision', revisionSchema);
