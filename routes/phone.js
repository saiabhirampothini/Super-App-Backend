const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
const crypto = require("crypto");
const auth = require("../middleware/auth");
require("dotenv").config(); //Adds the data from .env to process.env

const OTP = {}; // Declare GLOBAL OTP object for One-Time-Password Verification

//Verify phone POST request
//PUBLIC ROUTE
router.post("/", async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  function isValidIndianPhoneNumber(phoneNumber) {
    // Regular expression for Indian phone numbers with country code "+91" (12 digits starting with +91 followed by 10 digits)
    const regex = /^\+91[6789]\d{9}$/;
    return regex.test(phoneNumber);
  }
  if (!isValidIndianPhoneNumber(phoneNumber)) {
    return res
      .status(400)
      .json({ msg: "Error sending otp, please recheck your phone number" });
  }

  // Generate a 6-digit OTP
  const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
  };

  //Using SNS-SMS

  // Configure AWS with your credentials
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION, // Change to your AWS region
  });

  // Create new SNS object
  const sns = new AWS.SNS();
  const sendOTP = async (phoneNumber, otp) => {
    // Set up parameters for sending the message
    const params = {
      Message: `Your OTP for mobile number verification with X is ${otp} `,
      PhoneNumber: `${phoneNumber}`, // Replace with recipient's phone number
    };

    // Send the message
    sns.publish(params, (err, data) => {
      if (err) {
        console.error("Error sending SMS:", err);
        return res
          .status(400)
          .json({ msg: "Error sending otp, please recheck your phone number" });
      } else {
        console.log("SMS sent successfully:", data);
        return res.status(200).json({ msg: "OTP sent successfully" });
      }
    });
  };
  const otp = generateOTP();
  sendOTP(phoneNumber, otp);
  OTP[`${phoneNumber}`] = otp; //Assing the otp to GLOBAL OTP Object for verification
  setTimeout(() => {
    delete OTP[phoneNumber];
  }, 2 * 60 * 1000);
});

//Verify OTP POST ROUTE
//PUBLIC ROUTE

router.post("/otp", async (req, res) => {
  const otp = req.body.otp;
  const phoneNumber = req.body.phoneNumber;
  if (otp === OTP[phoneNumber]) {
    return res.status(200).json({ msg: "OTP verification successful" });
  } else {
    return res
      .status(400)
      .json({ msg: "OTP verification failed / OTP expired" });
  }
});


router.put("/add-phone", auth, async (req, res) => {
  const { phone } = req.body;
  const id = req.user.user.id;
  // console.log(req.user);
  try {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Update profile in DynamoDB
    const updateParams = {
      TableName: "SuperApp",
      Key: { id: id },
      UpdateExpression: "set #data.#phone = :phone",
      ExpressionAttributeNames: {
        "#data": "data",
        "#phone": "phone",
      },
      ExpressionAttributeValues: { ":phone": phone },
      ReturnValues: "UPDATED_NEW",
    };

    const result = await dynamoDb.update(updateParams).promise();
    // console.log(result);
    return res.status(200).json({ data: result.Attributes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error updating the address" });
  }
});


module.exports = router;
