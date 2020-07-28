const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
var MongoStore = require("connect-mongo")(session);
const winston = require("winston");
var cors = require('cors');

require("dotenv").config(); // FOR LOCAL USE ONLY

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
require("./startup/passport/passport-setup")();
require("./startup/db")();
require("./startup/cors")(app);
require("./startup/logging")();
require("./startup/prod")(app);
require("./startup/validation")();

// Create session
app.use(
  session({
    secret: "123456",
    resave: false,
    saveUninitialized: true,
    // Store session on DB
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://foodie-friendd.herokuapp.com"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

require("./routes/index")(app);

app.get("/", (req, res) => res.send("Hello!"));
app.listen(port, () => winston.info(`Server up and running on port ${port}...`));
