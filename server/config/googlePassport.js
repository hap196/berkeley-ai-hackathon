const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const SlackStrategy = require('@aoberoi/passport-slack').default.Strategy;
const User = require('../models/User');

passport.use('google-calendar', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/google-calendar/callback"
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

passport.use('google-gmail', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_GMAIL_CALLBACK_URL || "http://localhost:3000/api/gmail/callback"
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
    console.error('Error in Gmail strategy:', error);
    return done(error, null);
  }
}));

passport.use('slack', new SlackStrategy({
  clientID: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  callbackURL: process.env.SLACK_CALLBACK_URL || "http://localhost:3000/api/slack/callback",
  scope: ['identity.basic', 'channels:read', 'chat:write', 'users:read', 'team:read']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    return done(null, {
      profile,
      accessToken,
      refreshToken,
      isSlackAuth: true
    });
  } catch (error) {
    console.error('Error in Slack strategy:', error);
    return done(error, null);
  }
}));

module.exports = passport; 