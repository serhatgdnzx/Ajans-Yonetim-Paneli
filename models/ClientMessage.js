const mongoose = require('mongoose');

const clientMessageSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    readAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientMessage', clientMessageSchema);
