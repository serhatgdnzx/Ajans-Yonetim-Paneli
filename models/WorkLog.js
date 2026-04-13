const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema(
  {
    workCode: { type: String, unique: true, sparse: true, trim: true },
    date: { type: Date, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    projectName: { type: String, trim: true },
    activityType: { type: String, trim: true },
    description: { type: String, trim: true },
    responsiblePerson: { type: String, trim: true },
    durationMinutes: { type: Number, default: 0 },
    tags: { type: String, trim: true },
    status: { type: String, default: 'Bekliyor', trim: true },
    revisionCount: { type: Number, default: 0 },
    whatWasDone: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkLog', workLogSchema);
