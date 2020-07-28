const Validator = require("validator");
const isEmpty = require("is-empty");

module.exports = function validateResetPass(data) {
    let errors = {};
  // Convert empty fields to an empty string so we can use validator functions
    data.password = !isEmpty(data.password) ? data.password : "";
    data.password2 = !isEmpty(data.password2) ? data.password2 : "";
     
    // Password checks
    if (Validator.isEmpty(data.password)) {
      errors.newPassError = "Password field is required";
    }
  if (Validator.isEmpty(data.password2)) {
      errors.newPassConfError = "Confirm password field is required";
    }
  if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
      errors.newPassError = "Password must be at least 6 characters";
    }
  if (!Validator.equals(data.password, data.password2)) {
      errors.newPassConfError = "Passwords must match";
    }
    console.log(errors);
  return {
      errors,
      isValid: isEmpty(errors)
    };
  };
  