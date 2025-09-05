const mongoose = require('mongoose');
const pino = require('pino');
const pretty = require('pino-pretty');
const log = pino(pretty({ translateTime: true }));

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri, { autoIndex: true });
  log.info({ uri }, 'Connected to MongoDB');
}

module.exports = { connectMongo };


