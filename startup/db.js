const mongoose = require('mongoose');

// Connect to DB from env variable url, create instance
module.exports = function() {
  const db = process.env.DB;
  const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true    
  };
  mongoose
    .connect(db, options)
    .then(() => console.log(`Connected to ${db}...`));
};
