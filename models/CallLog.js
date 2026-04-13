const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    callerCallee: { type: String, trim: true },
    subject: { type: String, trim: true },
    result: { type: String, trim: true },
    responsiblePerson: { type: String, trim: true },
    notes: { type: String, trim: true },
    callbackDate: { type: Date },
    status: { type: String, default: 'Bekliyor', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallLog', callLogSchema);
