const AWS = require("aws-sdk");
const express = require("express");
const router = express.Router();
const axios = require("axios");
const sha256 = require("sha256");
const uniqid = require("uniqid");
const auth = require("../middleware/auth");
require("dotenv").config();

// const MERCHANT_ID = "PGTESTPAYUAT86";
// const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
// const SALT_INDEX = 1;
// const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
// const APP_BE_URL = "http://localhost:5000"; // our application

const MERCHANT_ID = process.env.MERCHANT_ID;
const PHONE_PE_HOST_URL = process.env.PHONE_PE_HOST_URL;
const SALT_INDEX = process.env.SALT_INDEX;
const SALT_KEY = process.env.SALT_KEY;
const APP_BE_URL = process.env.APP_BE_URL; // our application

const orders = [];
router.post("/pay", auth, async (req, res, next) => {
  // Initiate a payment

  // Transaction amount
  // const amount = +req.query.amount;
  console.log(MERCHANT_ID);
  const amount = req.body.total;

  // User ID is the ID of the user present in our application DB
  let userId = "MUID123";

  // Generate a unique merchant transaction ID for each transaction
  let merchantTransactionId = uniqid();
  orders.push({
    merchantTransactionId,
    productIDS: req.body.productIDS,
    quantities: req.body.quantities,
    buyerAddress: req.body.buyerAddress,
    modeOfPayment: req.body.modeOfPayment,
    userID: req.user.user.userID,
  });
  // console.log("hi");
  // redirect url => phonePe will redirect the user to this url once payment is completed. It will be a GET request, since redirectMode is "REDIRECT"
  let normalPayLoad = {
    merchantId: MERCHANT_ID, //* PHONEPE_MERCHANT_ID . Unique for each account (private)
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100, // converting to paise
    redirectUrl: `${APP_BE_URL}/api/payment-gateway/payment/validate/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  // make base64 encoded payload
  let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
  let base64EncodedPayload = bufferObj.toString("base64");

  // X-VERIFY => SHA256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + ### + SALT_INDEX
  let string = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
  let sha256_val = sha256(string);
  let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

  axios
    .post(
      `${PHONE_PE_HOST_URL}/pg/v1/pay`,
      {
        request: base64EncodedPayload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    )
    .then(function (response) {
      res.status(200).json({
        url: response.data.data.instrumentResponse.redirectInfo.url,
        id: merchantTransactionId,
      });
      // res.redirect("http://localhost:3000");
    })
    .catch(function (error) {
      console.log(error);
      res.send(error);
    });
});

router.get(
  "/payment/validate/:merchantTransactionId",
  async function (req, res) {
    const { merchantTransactionId } = req.params;
    // check the status of the payment using merchantTransactionId
    if (merchantTransactionId) {
      let statusUrl =
        `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/` +
        merchantTransactionId;

      // generate X-VERIFY
      let string =
        `/pg/v1/status/${MERCHANT_ID}/` + merchantTransactionId + SALT_KEY;
      let sha256_val = sha256(string);
      let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

      axios
        .get(statusUrl, {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyChecksum,
            "X-MERCHANT-ID": merchantTransactionId,
            accept: "application/json",
          },
        })
        .then(function (response) {
          console.log("response->", response.data);
          if (response.data && response.data.code === "PAYMENT_SUCCESS") {
            // redirect to FE payment success status page
            for (let i = 0; i < orders.length; i++) {
              if (orders[i].merchantTransactionId === merchantTransactionId) {
                orders[i].status = "PAYMENT_SUCCESS";
              }
            }
            console.log("Payment Success");

            const placeOrder = async () => {
              try {
                for (let i = 0; i < orders.length; i++) {
                  if (
                    merchantTransactionId === orders[i].merchantTransactionId
                  ) {
                    const response = await axios.post(
                      "https://super-app-backend.vercel.app/api/orders/multiple-orders-online",
                      {
                        productIDS: orders[i].productIDS,
                        quantities: orders[i].quantities,
                        buyerAddress: orders[i].buyerAddress,
                        modeOfPayment: orders[i].modeOfPayment,
                        userID: orders[i].userID,
                      }
                    );
                    if (response.status === 200) {
                      console.log("Order Placed successfully");
                    }
                  }
                }
              } catch (error) {
                console.log(error);
                console.error("Error placing order");
              }
            };
            placeOrder();

            const redirectUrl =
              "https://super-app-frontend-eight.vercel.app/orders";

            // Generate an HTML page with a link that redirects to the specified URL
            const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirect Page</title>
    </head>
    <body>
      <p>You will be redirected shortly...</p>
      <a href="${redirectUrl}">Click here if you are not redirected</a>
      <script>
        setTimeout(function() {
          window.location.href = "${redirectUrl}";
        }, 3000); // Redirect after 3 seconds
      </script>
    </body>
    </html>
  `;

            res.send(htmlResponse);
          } else {
            console.log("Payment failed");
            const redirectUrl =
              "https://super-app-frontend-eight.vercel.app/cart";

            // Generate an HTML page with a link that redirects to the specified URL
            const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirect Page</title>
    </head>
    <body>
      <p>You will be redirected shortly...</p>
      <a href="${redirectUrl}">Click here if you are not redirected</a>
      <script>
        setTimeout(function() {
          window.location.href = "${redirectUrl}";
        }, 3000); // Redirect after 3 seconds
      </script>
    </body>
    </html>
  `;

            // Send the HTML response
            res.send(htmlResponse);
          }
        })
        .catch(function (error) {
          // redirect to FE payment failure / pending status page
          res.send(error);
        });
    } else {
      res.send("Sorry!! Error");
    }
  }
);

let orderSingle = {};
router.post("/pay-single", auth, async (req, res, next) => {
  // Initiate a payment

  // Transaction amount
  // const amount = +req.query.amount;
  const amount = req.body.amount;
  console.log(amount);
  // User ID is the ID of the user present in our application DB
  let userId = "MUID123";

  // Generate a unique merchant transaction ID for each transaction
  let merchantTransactionId = uniqid();
  // console.log("heello");
  // console.log(req.body.quantity);
  orderSingle = new Object({
    merchantTransactionId,
    productID: req.body.productID,
    quantity: req.body.quantity,
    buyerAddress: req.body.buyerAddress,
    modeOfPayment: req.body.modeOfPayment,
    sellerID: req.body.sellerID,
    buyerID: req.user.user.userID,
  });
  // console.log("HElo");
  // console.log(orderSingle);
  // console.log("hi");
  // redirect url => phonePe will redirect the user to this url once payment is completed. It will be a GET request, since redirectMode is "REDIRECT"
  let normalPayLoad = {
    merchantId: MERCHANT_ID, //* PHONEPE_MERCHANT_ID . Unique for each account (private)
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100, // converting to paise
    redirectUrl: `${APP_BE_URL}/api/payment-gateway/payment-single/validate/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  // make base64 encoded payload
  let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
  let base64EncodedPayload = bufferObj.toString("base64");

  // X-VERIFY => SHA256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + ### + SALT_INDEX
  let string = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
  let sha256_val = sha256(string);
  let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

  axios
    .post(
      `${PHONE_PE_HOST_URL}/pg/v1/pay`,
      {
        request: base64EncodedPayload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    )
    .then(function (response) {
      res.status(200).json({
        url: response.data.data.instrumentResponse.redirectInfo.url,
        id: merchantTransactionId,
      });
      // res.redirect("http://localhost:3000");
    })
    .catch(function (error) {
      // console.log(error);
      res.send(error);
    });
});

router.get(
  "/payment-single/validate/:merchantTransactionId",
  async function (req, res) {
    const { merchantTransactionId } = req.params;
    // check the status of the payment using merchantTransactionId
    if (merchantTransactionId) {
      let statusUrl =
        `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/` +
        merchantTransactionId;

      // generate X-VERIFY
      let string =
        `/pg/v1/status/${MERCHANT_ID}/` + merchantTransactionId + SALT_KEY;
      let sha256_val = sha256(string);
      let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

      axios
        .get(statusUrl, {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyChecksum,
            "X-MERCHANT-ID": merchantTransactionId,
            accept: "application/json",
          },
        })
        .then(function (response) {
          console.log("response->", response.data);
          if (response.data && response.data.code === "PAYMENT_SUCCESS") {
            // redirect to FE payment success status page

            console.log("Payment Success");

            const placeOrder = async () => {
              try {
                if (
                  merchantTransactionId === orderSingle.merchantTransactionId
                ) {
                  // console.log("Test");
                  // console.log(orderSingle);
                  const response = await axios.post(
                    "https://super-app-backend.vercel.app/api/orders/add-orders",
                    {
                      productID: orderSingle.productID,
                      quantity: orderSingle.quantity,
                      buyerAddress: orderSingle.buyerAddress,
                      modeOfPayment: orderSingle.modeOfPayment,
                      sellerID: orderSingle.sellerID,
                      buyerID: orderSingle.buyerID,
                    }
                  );
                  if (response.status === 200) {
                    console.log("Order Placed successfully");
                  }
                }
              } catch (error) {
                // console.log(error);
                console.error("Error placing order");
              }
            };
            placeOrder();

            const redirectUrl =
              "https://super-app-frontend-eight.vercel.app/orders";

            // Generate an HTML page with a link that redirects to the specified URL
            const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirect Page</title>
    </head>
    <body>
      <p>You will be redirected shortly...</p>
      <a href="${redirectUrl}">Click here if you are not redirected</a>
      <script>
        setTimeout(function() {
          window.location.href = "${redirectUrl}";
        }, 3000); // Redirect after 3 seconds
      </script>
    </body>
    </html>
  `;

            res.send(htmlResponse);
          } else {
            console.log("Payment failed");
            const redirectUrl =
              "https://super-app-frontend-eight.vercel.app/cart";

            // Generate an HTML page with a link that redirects to the specified URL
            const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirect Page</title>
    </head>
    <body>
      <p>You will be redirected shortly...</p>
      <a href="${redirectUrl}">Click here if you are not redirected</a>
      <script>
        setTimeout(function() {
          window.location.href = "${redirectUrl}";
        }, 3000); // Redirect after 3 seconds
      </script>
    </body>
    </html>
  `;

            // Send the HTML response
            res.send(htmlResponse);
          }
        })
        .catch(function (error) {
          // redirect to FE payment failure / pending status page
          res.send(error);
        });
    } else {
      res.send("Sorry!! Error");
    }
  }
);

module.exports = router;
