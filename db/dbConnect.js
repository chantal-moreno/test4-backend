const mongoose = require('mongoose');
require('dotenv').config();

async function dbConnect() {
  try {
    // Connection to MongoDB with mongoose and DB_URL, increasing timeout to 30 seconds
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Successfully connected to MongoDB Atlas!');
  } catch (error) {
    console.log('Unable to connect to MongoDB Atlas!');
    console.error(error);
  }
}

module.exports = dbConnect;
