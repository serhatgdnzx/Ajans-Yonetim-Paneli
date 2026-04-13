const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    deliveryCode: { type: String, unique: true, sparse: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    workLog: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkLog', required: true },
    activityType: { type: String, trim: true },
    projectName: { type: String, trim: true },
    deliveryType: { type: String, trim: true },
    title: { type: String, trim: true },
    responsiblePerson: { type: String, trim: true },
    createdOn: { type: Date },
    deliveryDate: { type: Date },
    status: { type: String, trim: true },
    description: { type: String, trim: true },
    platform: { type: String, trim: true },
    postType: { type: String, trim: true },
    interaction: { type: Number },
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    shares: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
