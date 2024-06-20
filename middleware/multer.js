const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS=require('aws-sdk');
require("dotenv").config();

const s3 = new S3Client({
  credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.PRODUCT_IMAGES_S3_BUCKET,
    key: function (req, file, cb) {
      console.log(file);
      cb(
        null,
        // Uncomment and customize the key generation logic if needed
        req.user.user.userID +
          "@" +
          file.originalname.substring(0, file.originalname.indexOf(".")) +
          "/" +
          file.originalname
      );
    },
    acl: undefined
  }),
});

module.exports = upload;