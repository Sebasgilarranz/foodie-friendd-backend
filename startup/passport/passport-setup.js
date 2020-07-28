const passport = require("passport");
const { User } = require("../../models/user");
const LocalStrategy = require("passport-local").Strategy;

module.exports = function() {
  passport.use(
    new LocalStrategy((email, password, done) => {
      User.findOne({email}, (err, user) => {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Email doesn't exist" });
        }
        if (!user.validPassword(password)) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        return done(null, user);
      });
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) =>
    User.findById(id).then(user => done(null, user))
  );
};
