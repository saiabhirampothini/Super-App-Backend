const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rds_connection = require("../config/rds.js");

//POST ROUTE FOR CART
//@PRIVATE

router.post("/add-to-cart", auth, async (req, res) => {
  const { productID, quantity } = req.body;

  //CREATE CART IF NOT EXISTS
  const cartQuery1 = `CREATE TABLE IF NOT EXISTS CART(
  PRODUCT_ID VARCHAR(256),
  BUYER_ID VARCHAR(256),
  QUANTITY INT DEFAULT 1,
  PRIMARY KEY(PRODUCT_ID,BUYER_ID),
  FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID) ON DELETE CASCADE ON UPDATE CASCADE
  );`;

  rds_connection.query(cartQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    } else console.log("Query results: Table created successfully");
  });

  //Inset the data into the cart table
  if (quantity !== undefined) {
    addToCartTableQuery =
      "INSERT INTO CART (PRODUCT_ID, BUYER_ID, QUANTITY) VALUES (?, ?, ?)";
    insertValues = [productID, req.user.user.userID, quantity];
  } else {
    addToCartTableQuery =
      "INSERT INTO CART (PRODUCT_ID, BUYER_ID) VALUES (?, ?)";
    insertValues = [productID, req.user.user.userID];
  }
  rds_connection.query(
    addToCartTableQuery,
    insertValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query:", err.stack);
        res.status(500).json({
          msg: "Product is already in the cart",
        });
        return;
      } else {
        console.log("Insert ID:", results.insertId);
        res.status(200).json({ msg: "Product added to cart successfully!" });
      }
    }
  );
});

//GET ROUTE FOR CART
//@PRIVATE

router.get("/get-my-cart", auth, async (req, res) => {
  //GET the images of the product
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;
  const getMyCartQuery = `SELECT * FROM CART INNER JOIN SELLER ON CART.PRODUCT_ID=SELLER.PRODUCT_ID WHERE BUYER_ID=?;`;
  const insertValues = [req.user.user.userID];
  rds_connection.query(
    getMyCartQuery,
    insertValues,
    async (err, results, fields) => {
      if (err) {
        console.error("Error executing the query", err.stack);
        // res.status(500).json({ msg: "Error fetching the data" });
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

//DELETE ROUTE TO DELETE FROM CART
//@PRIVATE

router.delete("/delete-cart-item", auth, async (req, res) => {
  const { productID } = req.body;
  // console.log(productID);
  const deleteCartItemQuery = `DELETE FROM CART WHERE PRODUCT_ID=? AND BUYER_ID=?;`;
  const deleteValues = [productID, req.user.user.userID];
  rds_connection.query(
    deleteCartItemQuery,
    deleteValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query", err.stack);
        res.status(500).json({ msg: "Error deleting the item" });
        return;
      } else {
        console.log("Rows deleted:", results.affectedRows);
        res.status(200).json({ msg: "Cart Item Deleted" });
      }
    }
  );
});

//Edit cart
router.put("/edit-quantity", auth, async (req, res) => {
  const { productID, quantity } = req.body;
  const editQuantityQuery = `UPDATE CART SET QUANTITY=? WHERE PRODUCT_ID=? AND BUYER_ID=?;`;
  const editValues = [quantity, productID, req.user.user.userID];
  rds_connection.query(
    editQuantityQuery,
    editValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error updating the quantity of the item");
        res
          .status(500)
          .json({ msg: "Error updating the quantity of the item" });
      } else {
        res.status(200).json({ msg: "Quantity updated" });
      }
    }
  );
});
module.exports = router;
