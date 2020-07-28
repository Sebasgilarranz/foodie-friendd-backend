const Joi = require("joi");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const R = require("ramda");

//user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  passwordResetToken: { 
    type: String, 
    default: "" 
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: false
  },
  favorited: [],
});

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.hashPassword = function() {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err1, salt) => {
      if (err1) {
        reject(err1);
      }
      bcrypt.hash(this.password, salt, (err2, hash) => {
        if (err2) {
          reject(err2);
        }
        this.password = hash;
        resolve(hash);
      });
    });
  });
};

userSchema.methods.hidePassword = function() {
  return R.omit(["password", "__v", "_id"], this.toObject({ virtuals: true }));
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    email: Joi.string()
      .required()
      .email(),
    password: Joi.string()
      .required()
  };
  return Joi.validate(user, schema);
}

function validateLoginInput(input) {
  const schema = {
    email: Joi.string()
      .required(),
    password: Joi.string()
      .required()
  };
  return Joi.validate(input, schema);
}

function validateRegisterInput(input) {
  const schema = {
    password: Joi.string()
      .required(),
    email: Joi.string()
      .required()
      .email()
  };
  return Joi.validate(input, schema);
}

function validateEmail(input) {
  const schema = {
    email: Joi.string()
      .required()
      .email()
  };
  return Joi.validate(input, schema);
}

function validatePassword(input) {
  const schema = {
    password: Joi.string()
      .required()
  };
  return Joi.validate(input, schema);
}

exports.User = User;
exports.validateUser = validateUser;
exports.validateRegisterInput = validateRegisterInput;
exports.validateEmail = validateEmail;
exports.validateLoginInput = validateLoginInput;
exports.validatePassword = validatePassword;
