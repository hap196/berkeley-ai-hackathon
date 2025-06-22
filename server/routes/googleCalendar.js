const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
};

// Check Google Calendar connection status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      connected: user.googleCalendar?.connected || false,
      email: user.googleCalendar?.email || null
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Initiate Google Calendar OAuth
router.get('/connect', requireAuth, (req, res, next) => {
  // Store the user ID in session to link after OAuth
  req.session.pendingGoogleAuth = req.user._id;
  
  passport.authenticate('google-calendar', {
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'email',
      'profile'
    ]
  })(req, res, next);
});

// Google Calendar OAuth callback
router.get('/callback', async (req, res) => {
  try {
    passport.authenticate('google-calendar', { session: false }, async (err, authData, info) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_error`);
      }

      if (!authData) {
        console.error('No auth data received from Google');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_auth_data`);
      }

      const userId = req.session.pendingGoogleAuth;
      if (!userId) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_user`);
      }

      const { profile, accessToken, refreshToken } = authData;

      // Update user with Google Calendar credentials
      await User.findByIdAndUpdate(userId, {
        googleCalendar: {
          connected: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
          email: profile.emails?.[0]?.value,
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      delete req.session.pendingGoogleAuth;

      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connected=google-calendar`);
    })(req, res);
  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=calendar_setup`);
  }
});

// Disconnect Google Calendar
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      googleCalendar: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        email: null,
        expiresAt: null
      }
    });

    res.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

module.exports = router; 