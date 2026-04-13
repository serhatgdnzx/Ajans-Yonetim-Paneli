const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    workLog: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkLog' },
    platform: { type: String, trim: true },
    contentTitle: { type: String, trim: true },
    postType: { type: String, trim: true },
    interaction: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    status: { type: String, trim: true, default: 'Yayında' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialPost', socialPostSchema);
