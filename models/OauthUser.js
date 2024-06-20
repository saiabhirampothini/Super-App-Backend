const mongoose = require("mongoose");
const OauthUserSchema = new mongoose.Schema({
  profileID: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },

  profilePicture: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

const OauthUser = mongoose.model("oauthuser", OauthUserSchema);
module.exports = OauthUser;
