// const AWS = require("aws-sdk");
// const express = require("express");
// const router = express.Router();
// const auth = require("../middleware/auth");
// const upload = require("../middleware/multer.js");
// const { check, validationResult } = require("express-validator");
// const rds_connection = require("../config/rds.js");
// require("dotenv").config();

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// // POST route to post products
// // PRIVATE
// router.post(
//   "/add-products",
//   [
//     check("Price", "Price of the product selling is important ")
//       .not()
//       .isEmpty(),
//     check("Description", "Product description is critical for user experience")
//       .not()
//       .isEmpty(),
//     check("Specifications", "Specifications for product cannot be empty ")
//       .not()
//       .isEmpty(),
//     check("No_Of_Stocks", "number of stocks are required ").not().isEmpty(),
//     check("Seller_Address", "Seller address is required for delivery")
//       .not()
//       .isEmpty(),
//     check("Seller_City", "Seller city is required").not().isEmpty(),
//     check("Seller_State", "Seller state is required").not().isEmpty(),
//     check("Brand_Name", "Brand name is required").not().isEmpty(),
//     check("Model", "Model name is required").not().isEmpty(),
//     check("Category", "Category of the product is mandatory").not().isEmpty(),
//   ],
//   auth,
//   upload.array("files", 10),

//   async (req, res) => {
//     // Getting profile from DynamoDB

//     const dynamoDb = new AWS.DynamoDB.DocumentClient();
//     console.log(req.body);
//     const {
//       Price,
//       Description,
//       Specifications,
//       No_Of_Stocks,
//       Seller_Address,
//       Seller_City,
//       Seller_State,
//       Brand_Name,
//       Model,
//       Category,
//     } = req.body;

//     const Seller_ID = req.user.user.userID;
//     const Product_ID = req.user.user.userID + "@" + Brand_Name + Model;
//     const sellerValues = [
//       Product_ID,
//       Price,
//       Description,
//       Specifications,
//       Seller_ID,
//       No_Of_Stocks,
//       Seller_Address,
//       Seller_City,
//       Seller_State,
//       Brand_Name,
//       Model,
//       Category,
//     ];

//     const params = {
//       TableName: "SuperApp",
//       KeyConditionExpression: "id = :id",
//       ExpressionAttributeValues: { ":id": req.user.user.id },
//     };

//     const sellerProfile = await dynamoDb.query(params).promise();
//     if (!sellerProfile.Items[0].data.isSeller)
//       return res.status(400).json({
//         msg: "You are not a seller to sell the products on this platform. Kindly register as a seller in profile section",
//       });

//     const tableQuery1 = `CREATE TABLE IF NOT EXISTS SELLER(
//     PRODUCT_ID varchar(256) primary key,
//     PRICE DECIMAL(10,2),
//     DESCRIPTION  TEXT,
//     SPECIFICATIONS  TEXT,
//     SELLER_ID VARCHAR(256),
//     NO_OF_STOCKS INT,
//     SELLER_ADDRESS TEXT,
//     SELLER_CITY TEXT,
//     SELLER_STATE TEXT,
//     BRAND_NAME TEXT,
//     MODEL TEXT,
//     CATEGORY VARCHAR(256)
//   );`;

//     rds_connection.query(tableQuery1, (err, results, fields) => {
//       if (err) {
//         console.error("Error executing CREATE TABLE query for SELLER:", err);
//         return res.status(500).json({ error: "Internal server error" });
//       }
//       console.log("SELLER table creation results:", results);

//       const insertSellerQuery = `INSERT INTO SELLER (
//         Price,
//         Description,
//         Specifications,
//         Seller_ID,
//         No_Of_Stocks,
//         Seller_Address,
//         Seller_City,
//         Seller_State,
//         Brand_Name,
//         Model,
//         Category
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?, ?)`;

//       rds_connection.query(
//         insertSellerQuery,
//         sellerValues,
//         (err, results, fields) => {
//           if (err) {
//             // console.log(
//             //   "Error executing insert query for SELLER:",
//             //   err
//             // );
//             return res.status(500).json({ error: "Internal server error" });
//           }
//           console.log("Insert ID for SELLER:", results.insertId);
//           res.status(200).json({ message: "Product added successfully" });
//         }
//       );
//     });
//   }
// );

// //GET all products
// router.get("/get-all-products", auth, async (req, res) => {
//   //GET the images of the product
//   AWS.config.update({
//     region: process.env.AWS_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY,
//   });

//   const s3 = new AWS.S3();

//   const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;

//   const getAllProductQuery = "select * from SELLER;";
//   rds_connection.query(getAllProductQuery, async (err, results, fields) => {
//     if (err) {
//       console.log(err.stack);
//       res.status(500).json({ msg: "Error fetching All products" });
//     } else {
//       for (let i = 0; i < results.length; i++) {
//         const productID = results[i].PRODUCT_ID;
//         const prefix = productID; // Replace with your desired prefix
//         // console.log(results);
//         const params = {
//           Bucket: bucketName,
//           Prefix: prefix,
//         };
//         await s3
//           .listObjectsV2(params, (err, data) => {
//             if (err) {
//               console.error(err, err.stack);
//             } else {
//               const objects = data.Contents.map((obj) => obj.Key);
//               results[i].images = [];
//               for (let j = 0; j < objects.length; j++) {
//                 const url = `https://${process.env.PRODUCT_IMAGES_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objects[j]}`;
//                 results[i].images.push(url);
//               }
//             }
//           })
//           .promise();
//       }

//       res.status(200).json({ data: results });
//       // console.log(results);
//       // console.log(fields);
//     }
//   });
// });

// router.get("/get-product-by-seller", auth, async (req, res) => {
//   const getProductBySeller = `select * from SELLER where SELLER_ID=?;`;
//   const getValues = [req.user.user.userID];
//   rds_connection.query(
//     getProductBySeller,
//     getValues,
//     async (err, results, fields) => {
//       if (err) {
//         console.log(err.stack);
//         res.status(500).json({ msg: "Error fetching All products" });
//       } else {
//         for (let i = 0; i < results.length; i++) {
//           const productID = results[i].PRODUCT_ID;
//           const prefix = productID; // Replace with your desired prefix
//           // console.log(results);
//           const params = {
//             Bucket: bucketName,
//             Prefix: prefix,
//           };
//           await s3
//             .listObjectsV2(params, (err, data) => {
//               if (err) {
//                 console.error(err, err.stack);
//               } else {
//                 const objects = data.Contents.map((obj) => obj.Key);
//                 results[i].images = [];
//                 for (let j = 0; j < objects.length; j++) {
//                   const url = `https://${process.env.PRODUCT_IMAGES_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objects[j]}`;
//                   results[i].images.push(url);
//                 }
//               }
//             })
//             .promise();
//         }
//         res.status(200).json({ data: results });
//       }
//     }
//   );
// });

// router.delete("/delete-product", auth, async (req, res) => {
//   const { productID } = req.body;
//   const getProductBySeller = `delete from SELLER where SELLER_ID=? AND PRODUCT_ID=?;`;
//   const getValues = [req.user.user.userID, productID];
//   rds_connection.query(
//     getProductBySeller,
//     getValues,
//     (err, results, fields) => {
//       if (err) {
//         console.log(err.stack);
//         res.status(500).json({ msg: "Error fetching All products" });
//       } else {
//         res.status(200).json({ data: results });
//         // console.log(results);
//         // console.log(fields);
//       }
//     }
//   );
// });

// router.get("/:id", auth, async (req, res) => {
//   const getProductBySeller = `select * from SELLER where product_id=? and Seller_id=?;`;
//   const getValues = [req.params.id,req.user.user.userID];
//   AWS.config.update({
//     region: process.env.AWS_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY,
//   });
//   rds_connection.query(getProductBySeller, getValues, async (err, results, fields) => {
//     if (err) {
//       console.log(err.stack);
//       res.status(500).json({ msg: "Error fetching All products" });
//     } else {
//       // console.log(results);
//       const s3 = new AWS.S3();
//       for (let i = 0; i < results.length; i++) {
//         const productID = results[i].PRODUCT_ID;
//         const prefix = productID; // Replace with your desired prefix
//         // console.log(results);
//         const params = {
//           Bucket: process.env.PRODUCT_IMAGES_S3_BUCKET,
//           Prefix: prefix,
//         };
//         await s3
//           .listObjectsV2(params, (err, data) => {
//             if (err) {
//               console.error(err, err.stack);
//             } else {
//               const objects = data.Contents.map((obj) => obj.Key);
//               results[i].images = [];
//               for (let j = 0; j < objects.length; j++) {
//                 const url = `https://${process.env.PRODUCT_IMAGES_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objects[j]}`;
//                 results[i].images.push(url);
//               }
//             }
//           })
//           .promise();
//       }
//       res.status(200).json({ data: results });
//     }
//   });
// });

// module.exports = router;
const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/multer.js");
const { check, validationResult } = require("express-validator");
const rds_connection = require("../config/rds.js");
require("dotenv").config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// POST route to post products
// PRIVATE
router.post(
  "/add-products",
  [
    check("Price", "Price of the product selling is important ")
      .not()
      .isEmpty(),
    check("Description", "Product description is critical for user experience")
      .not()
      .isEmpty(),
    check("Specifications", "Specifications for product cannot be empty ")
      .not()
      .isEmpty(),
    check("No_Of_Stocks", "number of stocks are required ").not().isEmpty(),
    check("Seller_Address", "Seller address is required for delivery")
      .not()
      .isEmpty(),
    check("Seller_City", "Seller city is required").not().isEmpty(),
    check("Seller_State", "Seller state is required").not().isEmpty(),
    check("Brand_Name", "Brand name is required").not().isEmpty(),
    check("Model", "Model name is required").not().isEmpty(),
    check("Category", "Category of the product is mandatory").not().isEmpty(),
  ],
  auth,
  upload.array("files", 10),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Getting profile from DynamoDB
    // console.log(req.body)

    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    // console.log(req.body);
    const {
      Price,
      Description,
      Specifications,
      No_Of_Stocks,
      Seller_Address,
      Seller_City,
      Seller_State,
      Brand_Name,
      Model,
      Category,
    } = req.body;

    const Seller_ID = req.user.user.userID;
    const Product_ID = req.user.user.userID + "@" + Brand_Name + Model;
    const sellerValues = [
      Product_ID,
      Price,
      Description,
      Specifications,
      Seller_ID,
      No_Of_Stocks,
      Seller_Address,
      Seller_City,
      Seller_State,
      Brand_Name,
      Model,
      Category,
    ];

    // const productValues = [
    //   Product_ID,
    //   Brand_Name,
    //   Model,
    //   Category
    // ];

    // console.log(sellerValues);
    // console.log(productValues);

    const params = {
      TableName: "SuperApp",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": req.user.user.id },
    };

    const sellerProfile = await dynamoDb.query(params).promise();
    if (!sellerProfile.Items[0].data.isSeller)
      return res.status(400).json({
        msg: "You are not a seller to sell the products on this platform. Kindly register as a seller in profile section",
      });

    const tableQuery1 = `CREATE TABLE IF NOT EXISTS SELLER(
    PRODUCT_ID varchar(256) primary key,
    PRICE DECIMAL(10,2),
    DESCRIPTION  TEXT,
    SPECIFICATIONS  TEXT,
    SELLER_ID VARCHAR(256),
    NO_OF_STOCKS INT,
    SELLER_ADDRESS TEXT,
    SELLER_CITY TEXT,
    SELLER_STATE TEXT,
    BRAND_NAME TEXT,
    MODEL TEXT,
    CATEGORY VARCHAR(256),
    AVAILABILITY_STATUS INT DEFAULT 1
  );`;

    rds_connection.query(tableQuery1, (err, results, fields) => {
      if (err) {
        console.error("Error executing CREATE TABLE query for SELLER:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      console.log("SELLER table creation results:", results);

      const insertSellerQuery = `INSERT INTO SELLER (
        Product_ID,
        Price,
        Description,
        Specifications,
        Seller_ID,
        No_Of_Stocks,
        Seller_Address,
        Seller_City,
        Seller_State,
        Brand_Name,
        Model,
        Category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?, ?)`;

      rds_connection.query(
        insertSellerQuery,
        sellerValues,
        (err, results, fields) => {
          if (err) {
            console.log("in here");
            console.error(
              "Error executing insert query for SELLER:",
              err.stack
            );
            return res.status(500).json({ error: "Internal server error" });
          }
          console.log("Insert ID for SELLER:", results.insertId);
          res.status(200).json({ message: "Product added successfully" });
        }
      );
    });
  }
);

//GET all products
router.get("/get-all-products", auth, async (req, res) => {
  //GET the images of the product
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;

  const getAllProductQuery =
    "select * from SELLER WHERE AVAILABILITY_STATUS=1;";
  rds_connection.query(getAllProductQuery, async (err, results, fields) => {
    if (err) {
      console.log(err.stack);
      res.status(500).json({ msg: "Error fetching All products" });
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
      // console.log(results);
      // console.log(fields);
    }
  });
});

router.get("/get-product-by-seller", auth, async (req, res) => {
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;
  const getProductBySeller = `select * from SELLER where SELLER_ID=?;`;
  const getValues = [req.user.user.userID];
  rds_connection.query(
    getProductBySeller,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ msg: "Error fetching All products" });
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

router.put("/delete-product", auth, async (req, res) => {
  const { productID } = req.body;
  console.log(req.body);
  const getProductBySeller = `UPDATE SELLER SET AVAILABILITY_STATUS=0 WHERE SELLER_ID=? AND PRODUCT_ID=?;`;
  const getValues = [req.user.user.userID, productID];
  rds_connection.query(
    getProductBySeller,
    getValues,
    (err, results, fields) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ msg: "Error stopping products" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  );
});
router.put("/resume-product", auth, async (req, res) => {
  const { productID } = req.body;
  console.log(req.body);
  const getProductBySeller = `UPDATE SELLER SET AVAILABILITY_STATUS=1 WHERE SELLER_ID=? AND PRODUCT_ID=?;`;
  const getValues = [req.user.user.userID, productID];
  rds_connection.query(
    getProductBySeller,
    getValues,
    (err, results, fields) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ msg: "Error resuming products" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  );
});

//PUT Request to update the stocks
//@Private

router.put("/update-stocks", auth, async (req, res) => {
  const { productID, stocks } = req.body;
  console.log(stocks);
  const sellerID = req.user.user.userID;
  const updateQuery = `UPDATE SELLER SET NO_OF_STOCKS=? WHERE PRODUCT_ID=? AND SELLER_ID=?;`;
  const updateValues = [stocks, productID, sellerID];
  rds_connection.query(updateQuery, updateValues, (err, results, fields) => {
    if (err) {
      console.log(err.stack);
      res.status(500).json({ msg: "Error updating stocks" });
    } else {
      res.status(200).json({ data: results });
    }
  });
});

// router.get("/", auth, async (req, res) => {
//   const getProductBySeller = `show tables;`;
//   const getValues = [req.user.user.userID];
//   rds_connection.query(getProductBySeller, (err, results, fields) => {
//     if (err) {
//       console.log(err.stack);
//       res.status(500).json({ msg: "Error fetching All products" });
//     } else {
//       res.status(200).json({ data: results });
//       // console.log(results);
//       // console.log(fields);
//     }
//   });
// });

router.get("/:id", auth, async (req, res) => {
  const getProductBySeller = `select * from SELLER where product_id=? ;`;
  const getValues = [req.params.id];
  // console.log(getValues);
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });
  rds_connection.query(
    getProductBySeller,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ msg: "Error fetching All products" });
      } else {
        // console.log(results);
        const s3 = new AWS.S3();
        for (let i = 0; i < results.length; i++) {
          const productID = results[i].PRODUCT_ID;
          const prefix = productID; // Replace with your desired prefix
          // console.log(results);
          const params = {
            Bucket: process.env.PRODUCT_IMAGES_S3_BUCKET,
            Prefix: prefix,
          };
          await s3
            .listObjectsV2(params, (err, data) => {
              if (err) {
                console.error(err, err.stack);
              } else {
                const objects = data.Contents.map((obj) => obj.Key);
                // console.log(objects);
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

module.exports = router;
