const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI tanımlı değil. .env dosyasını kontrol edin.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('MongoDB bağlandı');
}

module.exports = { connectDB };
