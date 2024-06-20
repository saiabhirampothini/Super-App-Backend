const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

//GET Route for messages
router.post("/get-messages", async (req, res) => {
  const { from, to } = req.body;
  // console.log(from+" "+to);

  const params1 = {
    TableName: "Messages",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": `${from}&${to}` },
    ScanIndexForward: true, // Set to false if you want descending order
  };

  const params2 = {
    TableName: "Messages",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": `${to}&${from}` },
    ScanIndexForward: true, // Set to false if you want descending order
  };

  try {
    const [data1, data2] = await Promise.all([
      dynamoDb.query(params1).promise(),
      dynamoDb.query(params2).promise(),
    ]);
    const messages = [...data1.Items, ...data2.Items];

    const returnTwoWayMessages = [];

    for (let j = 0; j < messages.length; j++) {
      for (let i = 0; i < messages[j].messages.length; i++) {
        returnTwoWayMessages.push(messages[j].messages[i]);
      }
    }

    res.status(200).json({ data: returnTwoWayMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(200).json({ data: [] });
  }
});

//POST route to post messages
router.post("/add-messages", async (req, res) => {
  async function insertOrUpdateMessage(from, to, message, timestamp) {
    const id = `${from}&${to}`;

    const paramsPut = {
      TableName: "Messages",
      Item: {
        id: id,
        blocked: false,
        selfBlock: 0,
        messages: [
          {
            sender: from,
            receiver: to,
            message: message,
            timestamp: timestamp,
          },
        ],
      },
      ConditionExpression: "attribute_not_exists(id)",
    };

    const paramsUpdate = {
      TableName: "Messages",
      Key: { id: id },
      UpdateExpression: "SET #messages = list_append(#messages, :new_message)",
      ExpressionAttributeNames: {
        "#messages": "messages",
      },
      ExpressionAttributeValues: {
        ":new_message": [
          {
            sender: from,
            receiver: to,
            message: message,
            timestamp: timestamp,
          },
        ],
      },
      ReturnValues: "UPDATED_NEW",
    };

    try {
      // Attempt to insert the item
      await dynamoDb.put(paramsPut).promise();
      console.log(`Message with id ${id} inserted successfully.`);
      res
        .status(200)
        .json({ msg: `Message with id ${id} inserted successfully.` });
    } catch (error) {
      if (error.code === "ConditionalCheckFailedException") {
        // The item already exists, update it instead
        try {
          await dynamoDb.update(paramsUpdate).promise();
          console.log(`Message with id ${id} updated successfully.`);
          res
            .status(200)
            .json({ msg: `Message with id ${id} updated successfully.` });
        } catch (updateError) {
          console.error(`Failed to update message: ${updateError.message}`);
          res
            .status(500)
            .json({ msg: `Failed to update message: ${updateError.message}` });
        }
      } else {
        console.error(`Failed to insert message: ${error.message}`);
        res
          .status(500)
          .json({ msg: `Failed to insert message: ${error.message}` });
      }
    }
  }

  const { from, to, message } = req.body;
  insertOrUpdateMessage(from, to, message, new Date().toISOString());
});

//GET my messages

router.post("/my-chats", auth, async (req, res) => {
  const { userID } = req.body.userId; //Just temporary
  // console.log(req.body.userID);
  const params = {
    TableName: "Messages",
  };

  try {
    // Function to fetch all the messages and fileter based on userID
    const scanTable = async (params) => {
      let items = [];
      let data;
      do {
        data = await dynamoDb.scan(params).promise();
        items = items.concat(data.Items);
        params.ExclusiveStartKey = data.LastEvaluatedKey;
      } while (typeof data.LastEvaluatedKey !== "undefined");
      return items;
    };

    // Fetch all items
    const allItems = await scanTable(params);

    let chats = [];

    for (let i = 0; i < allItems.length; i++) {
      let item = allItems[i];
      let [sender, receiver] = item.id.split("&");
      if (sender === userID) {
        if (!chats.includes(receiver)) chats.push(receiver);
      } else if (receiver === userID) {
        if (!chats.includes(sender)) chats.push(sender);
      }
    }

    let index = chats.indexOf(req.user.user.userID);
    if (index !== -1) {
      // Check if the element exists in the array
      chats.splice(index, 1); // Remove the element at the found index
    }
    // console.log(chats);
    const profilePicData = await dynamoDb
      .scan({ TableName: "SuperApp" })
      .promise();
    // console.log(profilePicData.Items);
    const profilePicsDataArray = [];
    for (let i = 0; i < profilePicData.Items.length; i++) {
      // console.log(profilePicData.Items.data);
      profilePicsDataArray.push({
        userID: profilePicData.Items[i].data.userID,
        profilePicture: profilePicData.Items[i].data.profilePicture,
      });
    }
    const connectedChats = new Array();
    const seenChats = new Set();
    for (let i = 0; i < chats.length; i++) {
      for (let j = 0; j < profilePicsDataArray.length; j++) {
        if (
          chats[i] === profilePicsDataArray[j].userID &&
          !seenChats.has(chats[i])
        ) {
          connectedChats.push(
            chats[i] + " " + profilePicsDataArray[j].profilePicture
          );
          seenChats.add(chats[i]);
        }
      }
    }
    // console.log(chats);
    res.status(200).json({ data: connectedChats });
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).json({ message: "Error fetching chats" });
  }
});

//GET ROUTE for searching the users profiles

router.get("/profiles", auth, async (req, res) => {
  const params = {
    TableName: "SuperApp",
  };
  try {
    const scanTable = async (params) => {
      let items = [];
      let data;
      do {
        data = await dynamoDb.scan(params).promise();
        items = items.concat(data.Items);
        params.ExclusiveStartKey = data.LastEvaluatedKey;
      } while (typeof data.LastEvaluatedKey !== "undefined");
      return items;
    };

    // Fetch all profiles
    const allProfiles = await scanTable(params);
    // console.log(req.user.user.userID);
    const filteredProfiles = [];
    for (let i = 0; i < allProfiles.length; i++) {
      if (req.user.user.userID !== allProfiles[i].data.userID)
        filteredProfiles.push(allProfiles[i]);
    }
    // console.log(filteredProfiles);
    res.status(200).json({ data: filteredProfiles });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ message: "Error fetching profiles" });
  }
});

//POST route to delete close the chat for user

router.get("/close-chat", async (req, res) => {
  try {
    const { userID } = req.body;

    if (!userID) return res.json({ msg: "userID is required " });
    onlineUsers.delete(userID);
    return res.status(200).json({ msg: "Chat closed successfully" });
  } catch (err) {
    console.error("Error closing the chat:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
