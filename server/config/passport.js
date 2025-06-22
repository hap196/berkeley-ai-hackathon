const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists in our db
    let existingUser = await User.findOne({ githubId: profile.id });
    
    if (existingUser) {
      // Update existing user with new tokens
      existingUser.accessToken = accessToken;
      existingUser.refreshToken = refreshToken;
      await existingUser.save();
      return done(null, existingUser);
    }
    
    // If user doesn't exist, create a new user
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
      avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
      profileUrl: profile.profileUrl,
      accessToken: accessToken,
      refreshToken: refreshToken
    });
    
    const savedUser = await newUser.save();
    return done(null, savedUser);
    
  } catch (error) {
    console.error('Error in GitHub strategy:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 