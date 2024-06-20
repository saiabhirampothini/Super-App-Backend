const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rds_connection = require("../config/rds.js");

//POST ROUTE FOR REVIEWS
//@PRIVATE

router.post("/add-orders-cod", auth, async (req, res) => {
  const { productID, sellerID, quantity, modeOfPayment, buyerAddress } =
    req.body;
  // console.log(req.body);
  const ordersQuery1 = `CREATE TABLE IF NOT EXISTS ORDERS (
  PRODUCT_ID VARCHAR(256),
  BUYER_ID VARCHAR(256),
  SELLER_ID VARCHAR(256),
  BUYER_ADDRESS MEDIUMTEXT,
  ORDER_DATE DATE,
  QUANTITY INT,
  ESTIMATED_DELIVERY_DATE DATE,
  MODE_OF_PAYMENT VARCHAR(256),
  AMOUNT_TO_BE_PAID DECIMAL(10,2),
  ORDER_STATUS VARCHAR(20),
  FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID)  ON UPDATE CASCADE
);`;
  rds_connection.query(ordersQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log("Query results: Table Created", results);
  });

  let amountTOBePaid;
  if (modeOfPayment !== "COD") {
    amountTOBePaid = 0;
  }
  // console.log("fi");

  let availableNoOfStocks;
  const stockCheckQuery = `SELECT * FROM SELLER WHERE PRODUCT_ID=?;`;
  const checkValues = [productID];
  const checkStocks = async () => {
    rds_connection.query(
      stockCheckQuery,
      checkValues,
      (err, results, fields) => {
        if (err) {
          console.log("Error checking the quantity", err.stack);
          res.status(500).json({ msg: "Error checking the quantity" });
        } else {
          availableNoOfStocks = results[0].NO_OF_STOCKS;
          if (availableNoOfStocks < quantity) {
            return res.status(400).json({
              msg: "Error placing the order, quantity is not sufficient to supply",
            });
          } else {
            //Update the stocks
            const updateStocksquery = `UPDATE SELLER SET NO_OF_STOCKS=? WHERE PRODUCT_ID=?;`;
            const updateStocksValues = [
              availableNoOfStocks - quantity,
              productID,
            ];
            rds_connection.query(
              updateStocksquery,
              updateStocksValues,
              (err, results, fields) => {
                if (err) {
                  console.log("Error updating the quantity", err.stack);
                  res.status(500).json({ msg: "Error updating the quantity" });
                } else {
                  console.log("Updated the no of stocks");
                }
              }
            );

            //INSERT INTO ORDERS TABLE
            // Write logic for amount to be paid estimate delivery date
            const addOrderQuery = `INSERT INTO ORDERS VALUES(?,?,?,?,CURDATE(),?,?,?,?,"shipping");`;
            const addValues = [
              productID,
              req.user.user.userID,
              sellerID,
              buyerAddress,
              quantity,
              null,
              modeOfPayment,
              amountTOBePaid,
            ];

            rds_connection.query(
              addOrderQuery,
              addValues,
              (err, results, fields) => {
                if (err) {
                  console.log("Error placing the orders", err.stack);
                  res.status(500).json({ msg: "Error placing the order" });
                } else {
                  console.log("Insert ID:", results.insertId);
                  // res.status(200).json({ msg: "Order placed successfully!" });
                }
              }
            );

            //Update the amount to be paid
            const updatePrice = `UPDATE ORDERS SET AMOUNT_TO_BE_PAID=(SELECT PRICE FROM SELLER WHERE PRODUCT_ID=?) WHERE ISNULL(AMOUNT_TO_BE_PAID)`;
            const updateValues = [productID];
            rds_connection.query(
              updatePrice,
              updateValues,
              (err, results, fields) => {
                if (err) {
                  console.log(
                    "Error updating the amount to be paid",
                    err.stack
                  );
                  res
                    .status(500)
                    .json({ msg: "Error updating the amount to be paid" });
                } else {
                  console.log("Insert ID:", results.insertId);
                  res.status(200).json({ msg: "Order placed successfully!" });
                }
              }
            );
          }
        }
      }
    );
  };
  checkStocks();
});

router.post("/add-orders", async (req, res) => {
  const {
    productID,
    sellerID,
    buyerID,
    quantity,
    modeOfPayment,
    buyerAddress,
  } = req.body;
  console.log(req.body);
  const ordersQuery1 = `CREATE TABLE IF NOT EXISTS ORDERS (
  PRODUCT_ID VARCHAR(256),
  BUYER_ID VARCHAR(256),
  SELLER_ID VARCHAR(256),
  BUYER_ADDRESS MEDIUMTEXT,
  ORDER_DATE DATE,
  QUANTITY INT,
  ESTIMATED_DELIVERY_DATE DATE,
  MODE_OF_PAYMENT VARCHAR(256),
  AMOUNT_TO_BE_PAID DECIMAL(10,2),
  ORDER_STATUS VARCHAR(20),
  FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID)  ON UPDATE CASCADE
);`;
  rds_connection.query(ordersQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log("Query results: Table Created", results);
  });

  let amountTOBePaid;
  if (modeOfPayment !== "COD") {
    amountTOBePaid = 0;
  }
  // console.log("fi");

  let availableNoOfStocks;
  const stockCheckQuery = `SELECT * FROM SELLER WHERE PRODUCT_ID=?;`;
  const checkValues = [productID];
  const checkStocks = async () => {
    rds_connection.query(
      stockCheckQuery,
      checkValues,
      (err, results, fields) => {
        if (err) {
          console.log("Error checking the quantity", err.stack);
          res.status(500).json({ msg: "Error checking the quantity" });
        } else {
          availableNoOfStocks = results[0].NO_OF_STOCKS;
          if (availableNoOfStocks < quantity) {
            return res.status(400).json({
              msg: "Error placing the order, quantity is not sufficient to supply",
            });
          } else {
            //Update the stocks
            const updateStocksquery = `UPDATE SELLER SET NO_OF_STOCKS=? WHERE PRODUCT_ID=?;`;
            const updateStocksValues = [
              availableNoOfStocks - quantity,
              productID,
            ];
            rds_connection.query(
              updateStocksquery,
              updateStocksValues,
              (err, results, fields) => {
                if (err) {
                  console.log("Error updating the quantity", err.stack);
                  res.status(500).json({ msg: "Error updating the quantity" });
                } else {
                  console.log("Updated the no of stocks");
                }
              }
            );

            //INSERT INTO ORDERS TABLE
            // Write logic for amount to be paid estimate delivery date
            const addOrderQuery = `INSERT INTO ORDERS VALUES(?,?,?,?,CURDATE(),?,?,?,?,"shipping");`;
            const addValues = [
              productID,
              buyerID,
              sellerID,
              buyerAddress,
              quantity,
              null,
              modeOfPayment,
              amountTOBePaid,
            ];

            rds_connection.query(
              addOrderQuery,
              addValues,
              (err, results, fields) => {
                if (err) {
                  console.log("Error placing the orders", err.stack);
                  res.status(500).json({ msg: "Error placing the order" });
                } else {
                  console.log("Insert ID:", results.insertId);
                  // res.status(200).json({ msg: "Order placed successfully!" });
                }
              }
            );

            //Update the amount to be paid
            const updatePrice = `UPDATE ORDERS SET AMOUNT_TO_BE_PAID=(SELECT PRICE FROM SELLER WHERE PRODUCT_ID=?) WHERE ISNULL(AMOUNT_TO_BE_PAID)`;
            const updateValues = [productID];
            rds_connection.query(
              updatePrice,
              updateValues,
              (err, results, fields) => {
                if (err) {
                  console.log(
                    "Error updating the amount to be paid",
                    err.stack
                  );
                  res
                    .status(500)
                    .json({ msg: "Error updating the amount to be paid" });
                } else {
                  console.log("Insert ID:", results.insertId);
                  res.status(200).json({ msg: "Order placed successfully!" });
                }
              }
            );
          }
        }
      }
    );
  };
  checkStocks();
});

//POST ROUTE TO PLACE MULTIPLE ORDERS

router.post("/multiple-orders", auth, async (req, res) => {
  console.log("hi");
  const { productIDS, quantities, modeOfPayment, buyerAddress } = req.body;
  console.log(req.body);
  const sellerIDS = [];
  for (let i = 0; i < productIDS.length; i++) {
    const sellerID = productIDS[i].split("@")[0];
    sellerIDS.push(sellerID);
  }
  // console.log(sellerIDS);
  const ordersQuery1 = `CREATE TABLE IF NOT EXISTS ORDERS (
    PRODUCT_ID VARCHAR(256),
    BUYER_ID VARCHAR(256),
    SELLER_ID VARCHAR(256),
    BUYER_ADDRESS MEDIUMTEXT,
    ORDER_DATE DATE,
    QUANTITY INT,
    ESTIMATED_DELIVERY_DATE DATE,
    MODE_OF_PAYMENT VARCHAR(256),
    AMOUNT_TO_BE_PAID DECIMAL(10,2),
    ORDER_STATUS VARCHAR(20),
    FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID) ON DELETE CASCADE ON UPDATE CASCADE
  );`;
  rds_connection.query(ordersQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log("Query results: Table Created", results);
  });

  let amountTOBePaid;
  if (modeOfPayment !== "COD") {
    amountTOBePaid = 0;
  }

  const checkStocksQuery = `SELECT * FROM SELLER INNER JOIN CART ON SELLER.PRODUCT_ID=CART.PRODUCT_ID WHERE CART.BUYER_ID=? AND SELLER.NO_OF_STOCKS<CART.QUANTITY;`;
  const checkStocksValues = [req.user.user.userID];
  rds_connection.query(
    checkStocksQuery,
    checkStocksValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query");
        res.status(400).json({ msg: "Error placing the orders quantities" });
      } else {
        if (results.length !== 0) {
          let resultString = " There are insufficient quantities of ";
          for (let i = 0; i < results.length; i++) {
            resultString +=
              results[i].BRAND_NAME + " " + results[i].MODEL + " ,";
          }
          res.status(400).json({ msg: resultString });
        } else {
          const updateQuery = `UPDATE SELLER
INNER JOIN CART ON SELLER.PRODUCT_ID = CART.PRODUCT_ID
SET SELLER.NO_OF_STOCKS = SELLER.NO_OF_STOCKS - (
  SELECT SUM(QUANTITY)
  FROM CART
  WHERE CART.PRODUCT_ID = SELLER.PRODUCT_ID
  AND CART.BUYER_ID = ?
)
WHERE SELLER.PRODUCT_ID IN (
  SELECT PRODUCT_ID
  FROM CART
  WHERE CART.BUYER_ID = ?
);
`;
          const updateValues = [req.user.user.userID, req.user.user.userID];
          rds_connection.query(
            updateQuery,
            updateValues,
            (err, results, fields) => {
              if (err) {
                console.error("Error executing query Update");
                res.status(400).json({ msg: "Error placing the orders" });
              } else {
                for (let i = 0; i < productIDS.length; i++) {
                  let productID = productIDS[i];
                  let sellerID = sellerIDS[i];
                  let quantity = quantities[i];
                  console.log(quantity);
                  //Insert Order Into Table
                  const addOrderQuery = `INSERT INTO ORDERS VALUES(?,?,?,?,CURDATE(),?,?,?,?,"shipping");`;
                  const addValues = [
                    productID,
                    req.user.user.userID,
                    sellerID,
                    buyerAddress,
                    quantity,
                    null,
                    modeOfPayment,
                    amountTOBePaid,
                  ];

                  rds_connection.query(
                    addOrderQuery,
                    addValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        console.log("Insert ID:", results.insertId);
                        // res.status(200).json({ msg: "Order placed successfully!" });
                      }
                    }
                  );

                  //Upadate the price

                  const updatePrice = `UPDATE ORDERS SET AMOUNT_TO_BE_PAID=(SELECT PRICE FROM SELLER WHERE PRODUCT_ID=?) WHERE ISNULL(AMOUNT_TO_BE_PAID)`;
                  const updateValues = [productID];
                  rds_connection.query(
                    updatePrice,
                    updateValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        console.log("Amount to be paid pdated successfully");
                      }
                    }
                  );

                  //DELETE FROM CART
                  const delteFromCartQuery = `DELETE FROM CART WHERE PRODUCT_ID=? AND BUYER_ID=?`;
                  const deleteFromCartValues = [
                    productID,
                    req.user.user.userID,
                  ];
                  rds_connection.query(
                    delteFromCartQuery,
                    deleteFromCartValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        res
                          .status(200)
                          .json({ msg: "Orders Placed Successfully" });
                      }
                    }
                  );
                }
              }
            }
          );
        }
      }
    }
  );
  // res.status(200).json({ msg: "Quantities are sufficient" });
});

//Place ordes online
router.post("/multiple-orders-online", async (req, res) => {
  console.log("hi");
  const { productIDS, quantities, modeOfPayment, buyerAddress, userID } =
    req.body;
  console.log(req.body);
  const sellerIDS = [];
  for (let i = 0; i < productIDS.length; i++) {
    const sellerID = productIDS[i].split("@")[0];
    sellerIDS.push(sellerID);
  }
  // console.log(sellerIDS);
  const ordersQuery1 = `CREATE TABLE IF NOT EXISTS ORDERS (
    PRODUCT_ID VARCHAR(256),
    BUYER_ID VARCHAR(256),
    SELLER_ID VARCHAR(256),
    BUYER_ADDRESS MEDIUMTEXT,
    ORDER_DATE DATE,
    QUANTITY INT,
    ESTIMATED_DELIVERY_DATE DATE,
    MODE_OF_PAYMENT VARCHAR(256),
    AMOUNT_TO_BE_PAID DECIMAL(10,2),
    ORDER_STATUS VARCHAR(20),
    FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID) ON DELETE CASCADE ON UPDATE CASCADE
  );`;
  rds_connection.query(ordersQuery1, (err, results, fields) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log("Query results: Table Created", results);
  });

  let amountTOBePaid;
  if (modeOfPayment !== "COD") {
    amountTOBePaid = 0;
  }

  const checkStocksQuery = `SELECT * FROM SELLER INNER JOIN CART ON SELLER.PRODUCT_ID=CART.PRODUCT_ID WHERE CART.BUYER_ID=? AND SELLER.NO_OF_STOCKS<CART.QUANTITY;`;
  const checkStocksValues = [userID];
  rds_connection.query(
    checkStocksQuery,
    checkStocksValues,
    (err, results, fields) => {
      if (err) {
        console.error("Error executing query");
        res.status(400).json({ msg: "Error placing the orders quantities" });
      } else {
        if (results.length !== 0) {
          let resultString = " There are insufficient quantities of ";
          for (let i = 0; i < results.length; i++) {
            resultString +=
              results[i].BRAND_NAME + " " + results[i].MODEL + " ,";
          }
          res.status(400).json({ msg: resultString });
        } else {
          const updateQuery = `UPDATE SELLER
INNER JOIN CART ON SELLER.PRODUCT_ID = CART.PRODUCT_ID
SET SELLER.NO_OF_STOCKS = SELLER.NO_OF_STOCKS - (
  SELECT SUM(QUANTITY)
  FROM CART
  WHERE CART.PRODUCT_ID = SELLER.PRODUCT_ID
  AND CART.BUYER_ID = ?
)
WHERE SELLER.PRODUCT_ID IN (
  SELECT PRODUCT_ID
  FROM CART
  WHERE CART.BUYER_ID = ?
);
`;
          const updateValues = [userID, userID];
          rds_connection.query(
            updateQuery,
            updateValues,
            (err, results, fields) => {
              if (err) {
                console.error("Error executing query Update");
                res.status(400).json({ msg: "Error placing the orders" });
              } else {
                for (let i = 0; i < productIDS.length; i++) {
                  let productID = productIDS[i];
                  let sellerID = sellerIDS[i];
                  let quantity = quantities[i];
                  console.log(quantity);
                  //Insert Order Into Table
                  const addOrderQuery = `INSERT INTO ORDERS VALUES(?,?,?,?,CURDATE(),?,?,?,?,"shipping");`;
                  const addValues = [
                    productID,
                    userID,
                    sellerID,
                    buyerAddress,
                    quantity,
                    null,
                    modeOfPayment,
                    amountTOBePaid,
                  ];

                  rds_connection.query(
                    addOrderQuery,
                    addValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        console.log("Insert ID:", results.insertId);
                        // res.status(200).json({ msg: "Order placed successfully!" });
                      }
                    }
                  );

                  //Upadate the price

                  const updatePrice = `UPDATE ORDERS SET AMOUNT_TO_BE_PAID=(SELECT PRICE FROM SELLER WHERE PRODUCT_ID=?) WHERE ISNULL(AMOUNT_TO_BE_PAID)`;
                  const updateValues = [productID];
                  rds_connection.query(
                    updatePrice,
                    updateValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        console.log("Amount to be paid pdated successfully");
                      }
                    }
                  );

                  //DELETE FROM CART
                  const delteFromCartQuery = `DELETE FROM CART WHERE PRODUCT_ID=? AND BUYER_ID=?`;
                  const deleteFromCartValues = [productID, userID];
                  rds_connection.query(
                    delteFromCartQuery,
                    deleteFromCartValues,
                    (err, results, fields) => {
                      if (err) {
                        console.log("Error placing the orders", err.stack);
                        res
                          .status(500)
                          .json({ msg: "Error placing the order" });
                      } else {
                        res
                          .status(200)
                          .json({ msg: "Orders Placed Successfully" });
                      }
                    }
                  );
                }
              }
            }
          );
        }
      }
    }
  );
  // res.status(200).json({ msg: "Quantities are sufficient" });
});

//GET ROUTE FOR BUYER TO KNOW HIS ORDERS
//@PRIVATE
router.get("/get-buyer-orders", auth, async (req, res) => {
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;

  const getBuyerOrders = `SELECT * FROM ORDERS INNER JOIN SELLER ON ORDERS.PRODUCT_ID=SELLER.PRODUCT_ID WHERE BUYER_ID=?;`;
  const getValues = [req.user.user.userID];
  rds_connection.query(
    getBuyerOrders,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.error("Error fetching orders:", err.stack);
        res.status(500).json({ msg: "Error fetching the orders" });
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

//GET ROUTE FOR SELLER TO KNOW HIS ORDERS
//@PRIVATE
router.get("/get-seller-orders", auth, async (req, res) => {
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;

  const getSellerOrders = `SELECT * FROM ORDERS INNER JOIN SELLER ON ORDERS.PRODUCT_ID=SELLER.PRODUCT_ID WHERE ORDERS.SELLER_ID=?;`;
  const getValues = [req.user.user.userID];
  console.log(req.user.user.userID);
  rds_connection.query(
    getSellerOrders,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.error("Error fetching orders:", err.stack);
        res.status(500).json({ msg: "Error fetching the orders" });
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

//PUT ROUTE TO UPDATE DELIVERY STATUS
//@PRIVATE

router.put("/update-delivery-status", auth, async (req, res) => {
  const { productID, buyerID } = req.body;
  const updateDeliveryStatusQuery = `UPDATE ORDERS SET AMOUNT_TO_BE_PAID=?,ORDER_STATUS=? WHERE PRODUCT_ID=? AND SELLER_ID=? AND BUYER_ID=?;`;
  const updateValues = [
    0.0,
    "delivered",
    productID,
    req.user.user.userID,
    buyerID,
  ];
  rds_connection.query(
    updateDeliveryStatusQuery,
    updateValues,
    (err, results, fields) => {
      if (err) {
        console.err("Error executing the query", err.stack);
        res.status(500).json({ msg: "Error updating the delivery status" });
        return;
      } else {
        res.status(200).json({ data: results });
      }
    }
  );
});

router.post("/get-seller-orders-for-product", auth, async (req, res) => {
  const { productID } = req.body;
  const getBuyerOrders = `SELECT * FROM ORDERS WHERE SELLER_ID=? and PRODUCT_ID=?;`;
  const getValues = [req.user.user.userID, productID];
  rds_connection.query(getBuyerOrders, getValues, (err, results, fields) => {
    if (err) {
      console.error("Error fetching orders:", err.stack);
      res.status(500).json({ msg: "Error fetching the orders" });
    } else {
      return res.status(200).json({ data: results });
    }
  });
});

module.exports = router;
