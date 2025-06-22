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

// Get calendar events for a specific date
router.get('/events', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.googleCalendar?.connected || !user.googleCalendar?.accessToken) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get date parameter and user's timezone offset
    const date = req.query.date || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    const timezoneOffset = req.query.timezoneOffset ? parseInt(req.query.timezoneOffset) : new Date().getTimezoneOffset();
    
    const [year, month, day] = date.split('-').map(Number);
    const localMidnight = new Date(year, month - 1, day);
    
    const utcStart = new Date(localMidnight.getTime() + (timezoneOffset * 60 * 1000));
    const utcEnd = new Date(utcStart.getTime() + (24 * 60 * 60 * 1000) - 1);
    
    const timeMin = utcStart.toISOString();
    const timeMax = utcEnd.toISOString();

    const calendarList = await calendar.calendarList.list();
    
    console.log('Available calendars:', calendarList.data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary
    })));

    const calendarPromises = calendarList.data.items.map(async (cal) => {
      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: timeMin,
          timeMax: timeMax,
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime',
        });

        return response.data.items || [];
      } catch (error) {
        console.log(`Error fetching events from calendar ${cal.id}:`, error.message);
        return [];
      }
    });

    const calendarResults = await Promise.all(calendarPromises);
    const allEvents = calendarResults.flat();
    
    console.log('Total events found:', allEvents.length);
    console.log('Events by calendar:', calendarResults.map((events, index) => ({
      calendar: calendarList.data.items[index].summary,
      eventCount: events.length
    })));
    
    const formattedEvents = allEvents.map(event => ({
      id: event.id,
      title: event.summary || 'No title',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      isAllDay: !event.start?.dateTime,
      description: event.description || '',
      location: event.location || '',
      color: event.colorId || 'default'
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

module.exports = router; 