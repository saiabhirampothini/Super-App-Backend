const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { check, validationResult } = require("express-validator");
require("dotenv").config();

//store the token values for verification
const tokens = {};

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODE_MAILER_EMAIL,
    pass: process.env.NODE_MAILER_AUTH_PASS,
  },
});

//@route /emailVerify/
//@description Send email verification to validation
router.post(
  "/",
  [check("email", "Enter a valid email").isEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      //recieve email to verify
      const { email } = req.body;

      //create hexadecimal token
      const verificationToken = crypto.randomInt(100000, 999999).toString();

      //store token with corresponding email
      tokens[email] = verificationToken;

      const mailOptions = {
        from: "21bd1a056rcsed@gmail.com",
        to: email,
        subject: "Email Verification",
        html: `<p style="font-size:24px" >Please verify your email by Entering the following code in SuperApp application</p> <h1>${verificationToken}</h1>`,
      };

      await transporter.sendMail(mailOptions);

      res.status(201).json({ msg: "Email sent, please verify your email" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

//@Route /emailVerify/verify-email
//@description endpoint to verify
router.post("/verify-email", async (req, res) => {
  const { email, token } = req.body;

  try {
    // Check if the email exists in the tokens object and if the token matches
    if (
      !(email in tokens) ||
      tokens[email] !== token ||
      tokens[email] === undefined
    ) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }
    // Token is valid, proceed with verification
    // we should delete the token here
    delete tokens[email];

    res.status(200).json({ msg: "Email verified sucessfully" });
  } catch (error) {
    res.status(500).send("Server error");
  }
});
module.exports = router;
