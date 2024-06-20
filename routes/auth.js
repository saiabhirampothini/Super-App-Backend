const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const auth = require("../middleware/auth");
require("dotenv").config(); //Adds the data from .env to process.env

//Login Route
//PUBLIC ROUTE
router.post(
  "/",
  [
    check("emailOrPhone", "Please provide a valid Email or Phone Number")
      .not()
      .isEmpty(),
    check("password", "The password should atleast 8 characters long").isLength(
      { min: 8 }
    ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // console.log(req.body+" "+"here");
      return res.status(400).json({ errors: errors.array() });
    }
    const { emailOrPhone, password } = req.body;
    // console.log(emailOrPhone)
    // console.log(req.body+" "+"or here");

    const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegExp = /^\+91[6789]\d{9}$/;

    function isEmail(input) {
      return emailRegExp.test(input);
    }

    function isPhoneNumber(input) {
      return phoneRegExp.test(input);
    }
    let email = null;
    let phone = null;
    if (isEmail(emailOrPhone)) {
      email = emailOrPhone;
    } else if (isPhoneNumber(emailOrPhone)) {
      phone = emailOrPhone;
    }

    try {
      let user = null;
      if (email != null) {
        user = await User.findOne({ email });
      } else if (phone != null) {
        user = await User.findOne({ phone });
      }

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }

      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
      const dynamoDb = new AWS.DynamoDB.DocumentClient();

      const params = {
        TableName: "SuperApp",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: { ":id": user.id },
      };
      const profile = await dynamoDb.query(params).promise();
      //Generate Token
      const payload = {
        user: {
          id: user.id,
          userID: profile.Items[0].data.userID,
        },
      };
      const jwtSecretKey = process.env.JWT_SECRET_KEY;
      const token = jwt.sign(payload, jwtSecretKey, { expiresIn: 36000 }); //10 hrs
      res.cookie("token", token, {
        sameSite: "None",
        secure: true,
      }); // secure should be true in production with HTTPS
      res.status(200).json({ msg: "User Logged In Successfully" });
    } catch (err) {
      console.error(err.message);
      return res.status(500).send("Server Error");
    }
  }
);

router.get("/logout", auth, (req, res) => {
  try {
    res.clearCookie("token", { expires: new Date(0) });
    res.status(200).json({ msg: "Logout successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Logout not successful, please try again" });
  }
});

//For route protection
router.get("/check", auth, async (req, res) => {
  if (req.user.user.id && req.user.user.userID) {
    return res.status(200).json({ msg: "Token exists" });
  } else {
    return res.status(400).json({ msg: "Token does not exists" });
  }
});

module.exports = router;
