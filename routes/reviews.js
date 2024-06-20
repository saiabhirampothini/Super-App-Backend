const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rds_connection = require("../config/rds.js");
const upload = require("../middleware/multer.js");

//POST ROUTE FOR REVIEWS

router.post(
  "/add-reviews",
  auth,
  upload.array("images", 1),
  async (req, res) => {
    const { productID, reviewDescription, starsRating, sellerID, images } =
      req.body;
    const reviewQuery1 = `CREATE TABLE IF NOT EXISTS REVIEWS (
      PRODUCT_ID VARCHAR(256) ,
      REVIEW_DESCRIPTION TEXT,
      USER_ID VARCHAR(256),
      STARS_RATING INT,
      SELLER_ID VARCHAR(256),
      IMAGES TEXT,
      POSTED_DATE DATE,
      PRIMARY KEY(PRODUCT_ID,USER_ID),
      FOREIGN KEY(PRODUCT_ID) REFERENCES SELLER(PRODUCT_ID) ON DELETE CASCADE ON UPDATE CASCADE
    );`;
    rds_connection.query(reviewQuery1, (err, results, fields) => {
      if (err) {
        console.error("Error executing query:", err);
        return;
      }
      console.log("Query results : Table created successfully", results);
    });

    //INSERT INTO THE reviews table

    const insertReviewQuery = `INSERT INTO REVIEWS VALUES(?,?,?,?,?,?,CURDATE())`;
    const insertValues = [
      productID,
      reviewDescription,
      req.user.user.userID,
      starsRating,
      sellerID,
      images,
    ];

    rds_connection.query(
      insertReviewQuery,
      insertValues,
      (err, results, fields) => {
        if (err) {
          // console.error("Error fetching the data :", err.stack);
          res.status(500).json({ msg: "Error fetching the data" });
          return;
        } else {
          console.log("Insert ID:", results.insertId);
          res.status(200).json({ msg: "Review posted successfully!" });
        }
      }
    );
  }
);

//GET route to get the review of a product

router.post("/get-product-reviews", auth, async (req, res) => {
  //GET the images of the reviews
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const bucketName = process.env.PRODUCT_IMAGES_S3_BUCKET;
  const { productID } = req.body;
  const getProductReviewsQuery = `SELECT * FROM REVIEWS WHERE PRODUCT_ID=?`;
  const getValues = [productID];
  rds_connection.query(
    getProductReviewsQuery,
    getValues,
    async (err, results, fields) => {
      if (err) {
        console.error("Error fetching data", err.stack);
        res.status(500).json({ msg: "Error fetching the data for reviews" });
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
                // results[i].images = [];
                for (let j = 0; j < objects.length; j++) {
                  const url = `https://${process.env.PRODUCT_IMAGES_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objects[j]}`;
                  results[i].images = url;
                }
              }
            })
            .promise();
        }
        // console.log(results);
        res.status(200).json({ data: results });
      }
    }
  );
});

router.post("/get-product-reviews-additional", auth, async (req, res) => {
  const { productID } = req.body;

  const getProductReviewsQuery = `select avg(STARS_RATING) as avg_rating,count(*) as noofreviews from REVIEWS where product_id=?;`;
  const i = [productID];
  rds_connection.query(getProductReviewsQuery, i, (err, results, fields) => {
    if (err) {
      res.status(500).json({ msg: err });
    } else {
      // console.log(results);
      // console.log(fields)
      res.status(200).json({ data: results });
    }
  });
});

module.exports = router;
