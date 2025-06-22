const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use('google-calendar', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/calendar/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    return done(null, {
      profile,
      accessToken,
      refreshToken,
      isGoogleAuth: true
    });
  } catch (error) {
    console.error('Error in Google Calendar strategy:', error);
    return done(error, null);
  }
}));

module.exports = passport; 