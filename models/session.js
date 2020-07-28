const mongoose = require("mongoose");

const { Schema } = mongoose;

const sessionSchema = new Schema({
  session: String,
  session_id: String,
  expire: { 
    type: Date, 
    required: true, 
    default: Date.now, 
    expires: "30d" 
  }
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
