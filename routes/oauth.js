const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const OauthUser = require("../models/OauthUser");
const AWS = require("aws-sdk");
const router = express.Router();
require("dotenv").config();

//ClientId and Client SecretID
const clientID = process.env.CLIENT_ID_OAUTH;
const clientSecret = process.env.CLIENT_SECRET_OAUTH;

// Passport session setup
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await OauthUser.findById(id);
    if (!user) {
      console.log("User not found with ID:", id);
      return done(null, false);
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

// Google OAuth 2.0 configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: clientID,
      clientSecret: clientSecret,
      callbackURL:
        "https://super-app-backend.vercel.app/api/oauth/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        const existingUser = await OauthUser.findOne({ profileID: profile.id });
        if (existingUser) {
          // User already exists, update profile if necessary
          console.log("User already exists:", existingUser.email);
          return done(null, existingUser);
        }

        // New user, create a new OauthUser document
        const newUser = new OauthUser({
          profileID: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePicture: profile.photos[0].value,
        });
        await newUser.save(); // Save to database
        console.log("New user created:", newUser.email);

        //Create a profile in Dynamo DB
        // Set the region
        AWS.config.update({ region: process.env.AWS_REGION });
        // Create DynamoDB DocumentClient
        const docClient = new AWS.DynamoDB.DocumentClient();

        const atIndex = newUser.email.indexOf("@");

        // Extract the part before '@'
        const userID = newUser.email.substring(0, atIndex);

        // console.log(username);

        // Define the parameters
        const params = {
          TableName: "SuperApp",
          Item: {
            id: newUser.id,
            data: {
              name: newUser.name,
              userID: userID,
              profilePicture: newUser.profilePicture,
              email: newUser.email,
              isSeller: false,
              address: "",
              phone: "",
              gender: "",
              oauthUser: true,
              date: newUser.date.toString(),
            },
          },
        };

        // Put item into the table
        docClient.put(params, (err, data) => {
          if (err) {
            console.error(
              "Unable to add profile. JSON Error:",
              JSON.stringify(err, null, 2)
            );
          } else {
            console.log("Added profile");
          }
        });

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Routes
router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    // Successful authentication, redirect home.
    // console.log(req.user);
    let index = req.user.email.indexOf("@");
    let userID = req.user.email.substring(0, index);
    const payload = {
      user: {
        id: req.user.id,
        userID: userID,
      },
    };

    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const token = jwt.sign(payload, jwtSecretKey, { expiresIn: 36000 }); //10 hrs
    res.cookie("token", token); // secure should be true in production with HTTPS
    res.redirect("https://super-app-frontend-eight.vercel.app/DashBoard");
  }
);

module.exports = router;
