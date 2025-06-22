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

// Check Gmail connection status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      connected: user.gmail?.connected || false,
      email: user.gmail?.email || null
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Initiate Gmail OAuth
router.get('/connect', requireAuth, (req, res, next) => {
  // Store the user ID in session to link after OAuth
  req.session.pendingGmailAuth = req.user._id;
  
  passport.authenticate('google-gmail', {
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'email',
      'profile'
    ]
  })(req, res, next);
});

// Gmail OAuth callback
router.get('/callback', async (req, res) => {
  try {
    passport.authenticate('google-gmail', { session: false }, async (err, authData, info) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_error`);
      }

      if (!authData) {
        console.error('No auth data received from Google');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_auth_data`);
      }

      const userId = req.session.pendingGmailAuth;
      if (!userId) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_user`);
      }

      const { profile, accessToken, refreshToken } = authData;

      // Update user with Gmail credentials
      await User.findByIdAndUpdate(userId, {
        gmail: {
          connected: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
          email: profile.emails?.[0]?.value,
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      delete req.session.pendingGmailAuth;

      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connected=gmail`);
    })(req, res);
  } catch (error) {
    console.error('Error in Gmail callback:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=gmail_setup`);
  }
});

// Disconnect Gmail
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      gmail: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        email: null,
        expiresAt: null
      }
    });

    res.json({ success: true, message: 'Gmail disconnected' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// Get Gmail emails
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.gmail?.connected || !user.gmail?.accessToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.gmail.accessToken,
      refresh_token: user.gmail.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get list of emails
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox'
    });

    const messageIds = listResponse.data.messages || [];
    const emails = [];

    // Get details for each email
    for (const message of messageIds) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const email = messageResponse.data;
        const headers = email.payload.headers;

        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/^(.+)$/);
        const fromName = fromMatch ? fromMatch[1]?.replace(/"/g, '').trim() : '';
        const fromEmail = fromMatch && fromMatch[2] ? fromMatch[2].trim() : from;

        const snippet = email.snippet || '';

        const isRead = !email.labelIds?.includes('UNREAD');
        const isImportant = email.labelIds?.includes('IMPORTANT') || false;

        emails.push({
          id: email.id,
          subject,
          from: {
            name: fromName || fromEmail,
            email: fromEmail
          },
          snippet,
          date: new Date(date).toISOString(),
          isRead,
          isImportant
        });
      } catch (error) {
        console.log(`Error fetching email ${message.id}:`, error.message);
      }
    }

    res.json({ emails });
  } catch (error) {
    console.error('Error fetching Gmail emails:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

module.exports = router; 