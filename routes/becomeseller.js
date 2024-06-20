const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const AWS = require("aws-sdk");
require("dotenv").config();

router.get("/", auth, async (req, res) => {
  console.log(req.user.user.id);
  const id = req.user.user.id;
  try {
    // Configure AWS SDK
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
      UpdateExpression: "set #data.#isSeller = :isSeller",
      ExpressionAttributeNames: {
        "#data": "data",
        "#isSeller": "isSeller",
      },
      ExpressionAttributeValues: { ":isSeller": true },
      ReturnValues: "UPDATED_NEW",
    };

    const result = await dynamoDb.update(updateParams).promise();

    return res.status(200).json({ data: result.Attributes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
