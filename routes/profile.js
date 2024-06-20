const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const AWS = require("aws-sdk");
require("dotenv").config();

//GET route to get own profile\

router.get("/my-profile", auth, async (req, res) => {
  const id = req.user.user.id;
  try {
    //Getting profile from dynamodb
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: "SuperApp",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": `${id}` },
    };
    const profile = await dynamoDb.query(params).promise();
    const returnProfile = {
      userID: profile.Items[0].data.userID,
      profilePicture: profile.Items[0].data.profilePicture,
      firstName: profile.Items[0].data.firstName,
      lastName: profile.Items[0].data.lastName,
    };
    return res.status(200).json({ data: returnProfile });
  } catch (err) {
    console.error(err);

    return res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/get-full-profile", auth, async (req, res) => {
  const id = req.user.user.id;

  try {
    //Getting profile from dynamodb
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: "SuperApp",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": `${id}` },
    };
    const profile = await dynamoDb.query(params).promise();
    return res.status(200).json({ data: profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

//PUT request to add address

router.put("/add-address", auth, async (req, res) => {
  const { newAddress } = req.body;
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
      UpdateExpression: "set #data.#deliveryAddress = :deliveryAddress",
      ExpressionAttributeNames: {
        "#data": "data",
        "#deliveryAddress": "deliveryAddress",
      },
      ExpressionAttributeValues: { ":deliveryAddress": newAddress },
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
router.get("/my-address", auth, async (req, res) => {
  const id = req.user.user.id;
  try {
    //Getting profile from dynamodb
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: "SuperApp",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": `${id}` },
    };
    const profile = await dynamoDb.query(params).promise();
    const returnProfile = {
      address: profile.Items[0].data.deliveryAddress,
    };
    return res.status(200).json({ data: returnProfile });
  } catch (err) {
    console.error(err);

    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
