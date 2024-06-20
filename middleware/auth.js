const jwt = require("jsonwebtoken");
require("dotenv").config(); //Adds the data from .env to process.env
const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(400).json({ msg: "Unauthorized" });
  } else {
    try {
      const jwtSecretKey = process.env.JWT_SECRET_KEY;
      const payload = jwt.verify(token, jwtSecretKey);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(400).json({ msg: "Unauthorized" });
    }
  }
};
module.exports = auth;
