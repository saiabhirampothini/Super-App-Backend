const mongoose = require("mongoose");
require("dotenv").config(); //Adds the data from .env to process.env
const db = process.env.MONGO_URI;
const connectDb = async () => {
  try {
    await mongoose.connect(db);
    console.log("MongoDB connected..");
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

module.exports = connectDb;
