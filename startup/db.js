const winston = require('winston');
const mongoose = require('mongoose');

// Connect to DB from env variable url, create instance
module.exports = function() {
  const db = "mongodb+srv://foodyfriend:foodyfriend@cluster0.rjzyn.gcp.mongodb.net/foodyfriend?retryWrites=true&w=majority";
  const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true    
  };
  mongoose
    .connect(db, options)
    .then(() => winston.info(`Connected to ${db}...`));
};
