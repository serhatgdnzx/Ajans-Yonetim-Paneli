const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    sector: { type: String, trim: true },
    contractStart: { type: Date },
    monthlyFee: { type: Number, default: 0 },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    portalEnabled: { type: Boolean, default: false },
    portalEmail: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    portalPasswordHash: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
