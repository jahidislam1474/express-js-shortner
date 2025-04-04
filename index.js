const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectToMongoDB } = require("./connect");
const { restrictToLoggedinUserOnly, checkAuth } = require("./middlewares/auth");
const URL = require("./models/url");
const netlify = require('@netlify/express');

const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const userRoute = require("./routes/user");

const app = express();

// Environment variables setup
require('dotenv').config(); // Add this if using .env file locally

// Connect to MongoDB
connectToMongoDB(process.env.MONGODB || "mongodb://localhost:27017/short-url")
  .then(() => console.log("Mongodb connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use("/url", restrictToLoggedinUserOnly, urlRoute);
app.use("/user", userRoute);
app.use("/", checkAuth, staticRoute);

// Short URL redirect handler
app.get("/url/:shortId", async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const entry = await URL.findOneAndUpdate(
      { shortId },
      { $push: { visitHistory: { timestamp: Date.now() } } }
    );
    
    if (!entry) return res.status(404).send("URL not found");
    res.redirect(entry.redirectURL);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Server error");
  }
});

// Netlify adapter
module.exports.handler = netlify(app, {
  binaryMimeTypes: ['*/*'] // Add this for proper binary handling
});