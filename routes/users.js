const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const gravatar = require("gravatar");
const { check, validationResult } = require("express-validator");
const AWS = require("aws-sdk");
require("dotenv").config(); //Adds the data from .env to process.env

router.get("/", (req, res) => {
  res.send("Hi api from users route");
});

//Register POST Route
//PUBLIC ROUTE
router.post(
  "/",
  [
    check("firstName", "Please add a name").not().isEmpty(),
    check("lastName", "Please add a name").not().isEmpty(),
    check("userID", "Please add a username").not().isEmpty(),
    check("email", "Enter a valid email").isEmail(),
    check("phone", "Valid Indian Phone Number is required")
      .not()
      .isEmpty()
      .matches(/^\+91[6789]\d{9}$/),
    check("gender", "Gender is required").not().isEmpty(),
    check(
      "password",
      "Please enter a password with 8 or more characters with atleast one uppercase letter, one lowercase letter, one special character and one number"
    )
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .matches(/[a-z]/)
      .matches(/[0-9]/)
      .matches(/[!@#$%^&*(),.?":{}|<>]/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
   
    const { firstName, lastName, userID, email, phone, gender, password } =
      req.body;
    

    try {
      let user = await User.findOne({
        $or: [{ email }, { phone }, { userID }],
      });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      //Create avatar
      const avatar = gravatar.url(email, {
        //Options
        s: "200", //Size
        r: "pg", //Reading
        d: "mm",
      });

      user = new User({
        firstName,
        lastName,
        userID,
        avatar,
        email,
        phone,
        gender,
        password,
      });

      //Encrypting the password
      const salt = await bcryptjs.genSalt(10);
      user.password = await bcryptjs.hash(password, salt);

      //save the user
      await user.save();

      //Create a profile in Dynamo DB
      // Set the region
      AWS.config.update({ region: process.env.AWS_REGION }); // Change the region if necessary
      // Create DynamoDB DocumentClient
      const docClient = new AWS.DynamoDB.DocumentClient();
      // Define the parameters
      const params = {
        TableName: "SuperApp",
        Item: {
          id: user.id,
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            userID: user.userID,
            profilePicture: user.avatar,
            email: user.email,
            phone: user.phone,
            isSeller: false,
            address: "",
            oauthUser: false,
            gender: user.gender,
            date: user.date.toString(),
          },
        },
      };

      // Put item into the table
      docClient.put(params, (err, data) => {
        if (err) {
          console.error(
            "Unable to add profile. JSON Error:",
            JSON.stringify(err, null, 2)
          );
        } else {
          console.log("Added profile");
        }
      });

      //Generate Token
      const payload = {
        user: {
          id: user.id,
          userID: user.userID,
        },
      };
      const jwtSecretKey = process.env.JWT_SECRET_KEY;
      const token = jwt.sign(payload, jwtSecretKey, { expiresIn: 36000 }); //10 hrs
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 1800000, // Expire after 1/2 hour of interaction
      }); // secure should be true in production with HTTPS
      res.status(200).json({ msg: "User Registered Successfully" });
    } catch (err) {
      console.error(err.message);
      return res.status(500).send("Server Error");
    }
  }
);
module.exports = router;
