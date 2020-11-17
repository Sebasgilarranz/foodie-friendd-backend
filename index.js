const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var cors = require('cors');

require("dotenv").config(); // FOR LOCAL USE ONLY

const port = process.env.PORT || 5000;
const app = express();
require("./startup/passport/passport-setup")();
require("./startup/db")();
require("./startup/prod")(app);
require("./startup/validation")();

// Create session
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    // Store session on DB
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

require("./routes/index")(app);

app.get("/", (req, res) => res.send("Hello!"));
app.listen(port, () => console.log(`Server up and running on port ${port}...`));
