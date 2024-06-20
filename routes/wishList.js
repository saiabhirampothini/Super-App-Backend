const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rds_connection = require("../config/rds.js");

//POST ROUTE FOR CART
//@PRIVATE
router.post("/add-to-wishlist", auth, async (req, res) => {
  const { productID } = req.body;
  //CREATE WISHLIST TABLE
  const wishlistQuery1 = `CREATE TABLE IF NOT EXISTS WISHLIST (
      PRODUCT_ID varchar(256),
      BUYER_ID VARCHAR(256),
      PRIMARY KEY(PRODUCT_ID,BUYER_ID),
      FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID) ON DELETE CASCADE ON UPDATE CASCADE
    );`;
  rds_connection.query(wishlistQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log("Query results:", results);
  });
  //Insert to wishlist
  const insertToWishListQuery = `INSERT INTO WISHLIST VALUES(?,?)`;
  const insertValues = [productID, req.user.user.userID];
  rds_connection.query(
    insertToWishListQuery,
    insertValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query:", err.stack);
        res.status(500).json({ msg: "Error adding product to Wishlist" });

        return;
      } else {
        console.log("Insert ID:", results.insertId);
        res.status(200).json({ msg: "Added to wishlist successfully" });
      }
    }
  );
});

//GET ROUTE FOR WISHLIST
//@PRIVATE

router.get("/get-my-wishlist", auth, async (req, res) => {
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;

  const getFromWishListQuery = `SELECT * FROM WISHLIST INNER JOIN SELLER ON WISHLIST.PRODUCT_ID=SELLER.PRODUCT_ID WHERE BUYER_ID=?`;
  const getValues = [req.user.user.userID];
  rds_connection.query(
    getFromWishListQuery,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.error("Error executing query:", err.stack);
        return;
      } else {
        for (let i = 0; i < results.length; i++) {
          const productID = results[i].PRODUCT_ID;
          const prefix = productID; // Replace with your desired prefix
          // console.log(results);
          const params = {
            Bucket: bucketName,
            Prefix: prefix,
          };
          await s3
            .listObjectsV2(params, (err, data) => {
              if (err) {
                console.error(err, err.stack);
              } else {
                const objects = data.Contents.map((obj) => obj.Key);
                results[i].images = [];
                for (let j = 0; j < objects.length; j++) {
                  const url = `https://${process.env.PRODUCT_IMAGES_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objects[j]}`;
                  results[i].images.push(url);
                }
              }
            })
            .promise();
        }

        res.status(200).json({ data: results });
      }
    }
  );
});

//DELETE ROUTE FOR DELETING ITEM IN WISHLIST
//@PRIVATE

router.delete("/delete-wishlist-item", auth, async (req, res) => {
  const { productID } = req.body;
  // console.log(productID);
  const deleteWishlistItemQuery = `DELETE FROM WISHLIST WHERE PRODUCT_ID=? AND BUYER_ID=?;`;
  const deleteValues = [productID, req.user.user.userID];
  rds_connection.query(
    deleteWishlistItemQuery,
    deleteValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query", err.stack);
        res.status(500).json({ msg: "Error deleting the item" });
        return;
      } else {
        console.log("Rows deleted:", results.affectedRows);
        res.status(200).json({ msg: "WishList Item Deleted" });
      }
    }
  );
});

//Test
router.get("/", async (req, res) => {
  const insertTriggerQuery = `DELETE FROM ORDERS;
`;
  // const q = "SET GLOBAL log_bin_trust_routine_creators=1;";
  rds_connection.query(insertTriggerQuery, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
    } else {
      console.log(results); // More informative message
    }
  });

  res.status(200);
});
module.exports = router;
