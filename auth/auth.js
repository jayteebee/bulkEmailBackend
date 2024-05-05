const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
    });
  }
));

// Setup session and serialization
app.use(require('express-session')({ secret: 'secret', resave: false, saveUninitialized: false }));
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());


// auth-middleware.js

// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).send('User is not authenticated');
    }
  }
  
  // Middleware to check if the user has the required role
  function hasRole(requiredRole) {
    return function(req, res, next) {
      if (req.user.role === requiredRole) {
        next();
      } else {
        res.status(403).send('User does not have the necessary permissions');
      }
    };
  }
  
  module.exports = { ensureAuthenticated, hasRole };
  