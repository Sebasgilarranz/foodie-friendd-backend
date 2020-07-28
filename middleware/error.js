const winston = require('winston');

module.exports = function(err, req, res, next){
  winston.error(err.message, err);
  //const levels = { 
    //error: 0,
    //warn: 1,
    //info: 2,
    //http: 3,
    //verbose: 4,
    //debug: 5,
   // silly: 6
  //};
  res.status(500).send('Something failed.');
}
