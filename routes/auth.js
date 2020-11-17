const {
  User,
  validateLoginInput,
  validateRegisterInput,
  validateEmail,
  validatePassword
} = require("../models/user");
const { Token } = require("../models/token");
const moment = require("moment");
moment().format();
const express = require("express");
const crypto = require("crypto");
const passport = require("passport");
const sgMail = require("@sendgrid/mail");

const router = express.Router();

const host = process.env.HOST; // FRONTEND Host
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


/////////////////new///////////////
const validateRegisterInput1 = require("../validation/Register");
const validateLoginInput1 = require("../validation/Login");
const validateResetPass = require("../validation/ResetPass");
////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////
//                                      REGISTER                                        //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/register
// @desc Register user
// @access Public
// Register User inputs : email, password
router.post("/register", async (req, res) => {
  // Validate Register input
  const { error } = validateRegisterInput(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  //Check for existing email
  user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user)
    return res
      .status(400)
      .send({ message: "Email already registered. Take an another email" });

  // Create user Schema
  user = new User(req.body);
  //user = new User({email, password});

  // Hash password
  user.hashPassword().then(() => {
    // save user
    user.save((err, savedUser) => {
      if (err || !savedUser) {
        return res
          .status(400)
          .send({ message: "Create user failed, try again." });
      } else {
        // create a token
        const token = new Token({
          _userId: user._id,
          token: crypto.randomBytes(16).toString("hex")
        });
        // store it for validation 12h expires
        token.save(function(err) {
          if (err) {
            return res.status(500).send({ message: err.message });
          }
          // send verification email
          const msg = {
            to: user.email,
            from: `foodiefriend2020@gmail.com`,
            subject: 'Email Verification',
            text: " ",
            html: `<p>Please verify your account by clicking the link: 
                   <a href="${host}/account/confirm/${
                      token.token
                   }">${host}/account/confirm/${token.token}</a> </p>`
          };
          sgMail
            .send(msg)
            .then(() => {
              return res
                .status(200)
                .send({ success: true });
            })
            .catch(error => {
              return res
                .status(500)
                .send({ message: `Impossible to send email to ${user.email}` });
            });
        });
      }
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                              GET CONFIRMATION                                        //
/////////////////////////////////////////////////////////////////////////////////////////
// @route GET api/auth/confirmation/:token
// @desc Email verification/ get confirmation
// @access Public
// Input: null
router.get("/confirmation/:token", (req, res) => {
  // Find a matching token
  Token.findOne({ token: req.params.token }, function(err, token) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!token)
      return res.status(400).send({
        message:
          "We were unable to find a valid token."
      });

    // If we found a token, find a matching user
    User.findById(token._userId, function(err, user) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      if (!user)
        return res
          .status(400)
          .send({ message: `We were unable to find a user for this token.` });
      if (user.isVerified)
        return res
          .status(400)
          .send({ message: "This user has already been verified." });

      // Verify and save the user
      user.isVerified = true;
      user.expires = null;
      user.save(function(err) {
        if (err) {
          return res.status(500).send({ message: err.message });
        }
        return res
          .status(200)
          .send({ message: "The account has been verified." });
      });
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                                 LOGIN                                                //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/login
// @desc Login user
// @access Public
// Login User inputs : email, password
router.post("/login", (req, res, next) => {
  const { error } = validateLoginInput(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  req.body.email = req.body.email.toLowerCase();

  passport.authenticate("local", (err, user, info) => {

    if (err) {
      return next(err);
    }
    
    if (info && info.message === "Missing credentials") {
      return res.status(400).send({ message: "Missing credentials" });
    }
    if (!user) {
      return res.status(400).send({ message: "Invalid email or password." });
    }
    if (!user.isVerified){
      return res.status(401).send({
        message: "Your account has not been verified."});
    }
    
    req.login(user, err => {
      if (err) {
        return res.status(401).send({ message: "Login failed", err });
      }
      return res.send({ success: true, user: user.hidePassword() });
    });
  })(req, res, next);

});


///////////////////////////////////////////////////////////////////////////////////////////
//                              FORGOT PASSWORD                                         //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/login/fogot
// @desc Send reset password link
// Inputs : email
router.post("/login/forgot", (req, res) => {
  const { error } = validateEmail(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  User.findOne({ email: req.body.email }, function(err, user) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!user)
      return res.status(400).send({ message: "This email is not valid." });

    // Create a verification token
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex")
    });

    user.passwordResetToken = token.token;
    user.passwordResetExpires = moment().add(24, "hours");

    user.save(function(err) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      // Save the token
      token.save(function(err) {
        if (err) {
          return res.status(500).send(err.message);
        }
        // Send the mail
        const mail = {
          to: user.email,
          from: `foodiefriend2020@gmail.com`,
          subject: 'Reset Password Link',
          text: " ",
          html: `<p>
          You are receiving this because you have requested the reset of the password for your account.
          </br></br>Please copy and paste code into your browser.</br></br></br>
          ${token.token}
          </br></br>If you did not request this, please ignore this email and your password will remain unchanged.</br></br></br>
          </p>`
        };
        sgMail
          .send(mail)
          .then(() => {
            return res
              .status(200)
              .send({ message: "A reset password link has been sent to your email." });
          })
          .catch(error => {
            return res.status(500).send({ message: error });
          });
      });
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                              RESET PASSWORD                                          //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/login/reset
// @desc Reset password
// Reset password inputs : token, password 
router.post("/login/reset/:token", (req, res) => {
  // Validate password Input
  const { error } = validatePassword(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });
  // Find a matching token
  Token.findOne({ token: req.params.token }, function(err, token) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!token)
      return res.status(400).send({
        message: "This token is not valid. Your token may have expired."
      });

    // If we found a token, find a matching user
    User.findById(token._userId, function(err, user) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      if (!user)
        return res
          .status(400)
          .send({ message: `We were unable to find a user for this token.` });
      if (user.passwordResetToken !== token.token)
        return res.status(400).send({
          message:
            "User token and your token didn't match. You may have a more recent token in your mail list."
        });
      // Verify that the user token expires date has not been passed
      if (moment().utcOffset(0) > user.passwordResetExpires) {
        return res.status(400).send({
          message: "Token has expired."
        });
      }
      // Update user
      user.password = req.body.password;
      user.passwordResetToken = "nope";
      user.passwordResetExpires = moment().utcOffset(0);
      //Hash new password
      user.hashPassword().then(() =>
        // Save updated user to the database
        user.save(function(err) {
          if (err) {
            return res.status(500).send({ message: err.message });
          }
          // Send mail confirming password change to the user
          const mail = {
            to: user.email,
            from: `foodiefriend2020@gmail.com`,
            subject: 'Email Verification',
            text: " ",
            html: `<p>This is a confirmation that the password for your account ${ user.email} has just been changed. </p>`
          };
          sgMail
          .send(mail)
          .catch(error => {
            return res.status(500).send({ message: error });
          });
          return res
            .status(200)
            .send({ message: "Password has been reset." });
        })
      );
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                                   RESEND LINK                                         //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/resend
// @desc Resend confirmation link
// Inputs : email
router.post("/resend", (req, res) => {
  // Check for validation errors
  const { error } = validateEmail(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  User.findOne({ email: req.body.email }, function(err, user) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!user)
      return res
        .status(400)
        .send({ message: "We were unable to find a user with that email." });
    if (user.isVerified)
      return res.status(400).send({
        message: "This account has already been verified."
      });

    // Create a verification token, save it, and send email
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex")
    });

    // Save the token
    token.save(function(err) {
      if (err) {
        return res.status(500).send(err.message);
      }
      // Send the mail
      const mail = {
        to: user.email,
        from: `foodiefriend2020@gmail.com`,
        subject: 'Email Verification',
        text: " ",
        html: `<p>Please verify your account by clicking the link: 
        <a href="${host}/login/${
           token.token
        }">Click Here</a> </p>`
      };
      sgMail
        .send(mail)
        .then(() => {
          return res
            .status(200)
            .send({ message: "A verification mail has been sent." });
        })
        .catch(error => {
          return res.status(500).send({ message: error });
        });
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                                      LOGOUT                                          //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/logout
// @desc Logout
// Logout User inputs : null
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(400).send({ message: "Logout failed", err });
    }
    req.sessionID = null;
    req.logout();
    res.send({ message: "Logged out successfully" });
  });
});



///////////////////////////////////////////////////////////////////////////////////////////
//                          DELETE USER NOT VERIFIED                                    //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/register/reset
// @desc Reset register / Delete user with the email if is unverified
// @access Public
// Input: email
router.post("/register/reset", (req, res) => {
  const { error } = validateEmail(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  User.findOneAndDelete({ email: req.body.email, isVerified: false }, function(err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    return res
      .status(200);
  });
});



///////////////////////////////////////////////////////////////////////////////////////////
//                                    REGISTER 1                                        //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/register
// @desc Register user
// @access Public
// Register User inputs : email, password
router.post("/register1", async (req, res) => {
  // Validate Register input
  // const val = 
  // {
  //   email: req.body.email,
  //   password: req.body.password
  // }
  const { errors, isValid } = validateRegisterInput1(req.body);
  // const { error } = validateRegisterInput(req.body);
  if (!isValid) 
  {
    return res.status(400).json(errors);
  }

  let emailErrors = {};
  //Check for existing email
  user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user)
  {
    emailErrors.email = "Email is already registered."
    return res
      .status(400)
      .json(emailErrors);
  }

  // Create user Schema
  user = new User(req.body);
  //user = new User({email, password});

  // Hash password
  user.hashPassword().then(() => {
    // save user
    user.save((err, savedUser) => {
      if (err || !savedUser) {
        return res
          .status(400)
          .send({ message: "Create user failed, try again." });
      } else {
        // create a token
        const token = new Token({
          _userId: user._id,
          token: crypto.randomBytes(16).toString("hex")
        });
        // store it for validation 12h expires
        token.save(function(err) {
          if (err) {
            return res.status(500).send({ message: err.message });
          }
          // send verification email
          const msg = {
            to: user.email,
            from: `foodiefriend2020@gmail.com`,
            subject: 'Email Verification',
            text: " ",
            html: `<p>Please verify your account by clicking the link: 
                   <a href="${host}/login/${
                      token.token
                   }">Click Here</a> </p>`
          };
          sgMail
            .send(msg)
            .then(() => {
              return res
                .status(200)
                .send({ success: true });
            })
            .catch(error => {
              return res
                .status(500)
                .send({ message: `Impossible to send email to ${user.email}` });
            });
        });
      }
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
//                            GET CONFIRMATION 1                                        //
/////////////////////////////////////////////////////////////////////////////////////////
// @route GET api/auth/confirmation/:token
// @desc Email verification/ get confirmation
// @access Public
// Input: null
router.post("/confirmation1", (req, res) => {
  // Find a matching token
  Token.findOne({ token: req.body.token }, function(err, token) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!token)
    {
      return res.status(400).send({
        message:
          "We were unable to find a valid token."
      
      });
    }

    // If we found a token, find a matching user
    User.findById(token._userId, function(err, user) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      if (!user)
        return res
          .status(400)
          .send({ message: `We were unable to find a user for this token.` });
      if (user.isVerified)
        return res
          .status(400)
          .send({ message: "This user has already been verified." });

      // Verify and save the user
      user.isVerified = true;
      user.expires = null;
      user.save(function(err) {
        if (err) {
          return res.status(500).send({ message: err.message });
        }else{
          return res.status(200).send({success: true});
          
          }
      });
    });
  });
});

////////////////////////////////////////////////////////////////////////////////////////////
//                                       LOGIN 1                                         //
//////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/login
// @desc Login user
// @access Public
// Login User inputs : email, password
router.post("/login1", (req, res, next) => {
  const { errors, isValid } = validateLoginInput1(req.body);
  if (!isValid) 
  {
    return res.status(400).json(errors);
  }

  req.body.email = req.body.email.toLowerCase();

  passport.authenticate("local", (err, user, info) => {
    let errors = {};
    if (err) {
      return next(err);
    }
    
    if (!user) {
      console.log("1");
      errors.password = "Invalid email or password."
      return res.status(400).json(errors);
    }
    if (!user.isVerified){
    {
      console.log("2");
      errors.email = "Email has not been verified."
      return res.status(401).json(errors);
    }
    }
    
    req.login(user, err => {
      if (err) {
        console.log("3");
        return res.status(401).send({ message: "Login failed", err });
      }
     
      return res.send({ success: true, user: user.hidePassword() });
    });
  })(req, res, next);

});

///////////////////////////////////////////////////////////////////////////////////////////
//                              RESET PASSWORD 1                                        //
/////////////////////////////////////////////////////////////////////////////////////////
// @route POST api/auth/login/reset
// @desc Reset password
// Reset password inputs : token, password 
router.post("/login/reset1", (req, res) => {
  // Validate password Input
  const { errors , isValid } = validateResetPass(req.body);
  if (!isValid) 
  {
    return res.status(400).send({message: "test"});
  }
  // Find a matching token
  Token.findOne({ token: req.body.verification }, function(err, token) {
    if (err) {
      return res.status(500).send({ message: err.message });
    }
    if (!token)
    {
      return res.status(401).send({
        message: "This token is not valid. Your token may have expired."
      });
    }

    // If we found a token, find a matching user
    User.findById(token._userId, function(err, user) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      if (!user)
      {
        return res
          .status(400)
          .send({ message: `We were unable to find a user for this token.` });
      }
      if (user.passwordResetToken !== token.token)
      {
        
        return res.status(400).send({
          message:
            "User token and your token didn't match. You may have a more recent token in your mail list."
        });
      }
      // Verify that the user token expires date has not been passed
      if (moment().utcOffset(0) > user.passwordResetExpires) {
        return res.status(400).send({
          message: "Token has expired."
        });
      }
      // Update user
      user.password = req.body.password;
      user.passwordResetToken = "nope";
      user.passwordResetExpires = moment().utcOffset(0);
      //Hash new password
      user.hashPassword().then(() =>
        // Save updated user to the database
        user.save(function(err) {
          if (err) {
            return res.status(500).send({ message: err.message });
          }
          // Send mail confirming password change to the user
          const mail = {
            to: user.email,
            from: `foodiefriend2020@gmail.com`,
            subject: 'Email Verification',
            text: " ",
            html: `<p>This is a confirmation that the password for your account ${ user.email} has just been changed. </p>`
          };
          sgMail
          .send(mail)
          .catch(error => {
            return res.status(500).send({ message: error });
          });
          return res
            .status(200)
            .send({ message: "Password has been reset." });
        })
      );
    });
  });
});


///////////////////////////////////////////////////////////////////////////////////////////
//                                 ADD FAVORITE                                         //
/////////////////////////////////////////////////////////////////////////////////////////
router.post("/addFavorite", (req, res) => {
  const restId = req.body.restData;
 
  User.findOneAndUpdate({_id: req.body.id},{
      $push: { favorited: restId }
    }, { 'new': true}, (err, result) => {
    if (err){ return res.status(400).send();}
    else {
    return res.status(200).send();
    }

  })
});

///////////////////////////////////////////////////////////////////////////////////////////
//                                    GET FAVORITE                                      //
/////////////////////////////////////////////////////////////////////////////////////////
router.get("/getFavorites", (req, res) => {

   User.findById(req.query.id, (error, data) => {
    if (error) {
        return next(error)
    } else {
      return res.status(200).send(data.favorited);
    }
    })
    
});

///////////////////////////////////////////////////////////////////////////////////////////
//                              IS FAV                                                  //
/////////////////////////////////////////////////////////////////////////////////////////
router.post("/isFav", (req,res)=> {
  User.findOne({_id:req.body.id, favorited: req.body.restData}, function(err, result) {
     if(result) 
    { 
      return res.status(200).send(result);  
    }else return res.status(400).send();
   
  })
});

///////////////////////////////////////////////////////////////////////////////////////////
//                                   REMOVE FAV                                         //
/////////////////////////////////////////////////////////////////////////////////////////
router.post("/removeFav", (req,res)=> {
  const restData = req.body.restData;
  User.findOneAndUpdate({_id: req.body.id},{
    $pull: { favorited: restData }
  }, { 'new': true}, (err, result) => {
  if (err){ return res.status(400).send();}
  else {
  return res.status(200).send(err);
  }

})
});

/////////////////////////////////////////////////////////////////////////////

module.exports = router;