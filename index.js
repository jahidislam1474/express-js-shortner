const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectToMongoDB } = require("./connect");
const { restrictToLoggedinUserOnly, checkAuth } = require("./middlewares/auth");
const URL = require("./models/url");
const serverless = require('serverless-http');

// Initialize Express app
const app = express();

// Environment variables setup
require('dotenv').config(); // Add this for local development

// Connect to MongoDB with error handling
connectToMongoDB(process.env.MONGODB)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use("/.netlify/functions/server/url-list", restrictToLoggedinUserOnly, urlRoute);
app.use("/.netlify/functions/server/user", userRoute);
app.use("/.netlify/functions/server", checkAuth, staticRoute);

// URL redirect handler with error handling
app.get("/.netlify/functions/server/url/:shortId", async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const entry = await URL.findOneAndUpdate(
      { shortId },
      { $push: { visitHistory: { timestamp: Date.now() } } }
    );

    if (!entry) {
      return res.status(404).send("URL not found");
    }
    res.redirect(entry.redirectURL);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Server error");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// new code addred
// Netlify serverless handler
module.exports.handler = serverless(app);