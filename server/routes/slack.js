const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
};

router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      connected: user.slack?.connected || false,
      teamName: user.slack?.teamName || null,
      username: user.slack?.username || null
    });
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Slack OAuth
router.get('/connect', requireAuth, (req, res, next) => {
  req.session.pendingSlackAuth = req.user._id;
  
  passport.authenticate('slack', {
    scope: ['identity.basic', 'channels:read', 'chat:write', 'users:read', 'team:read']
  })(req, res, next);
});

// Slack OAuth callback
router.get('/callback', async (req, res) => {
  try {
    passport.authenticate('slack', { session: false }, async (err, authData, info) => {
      if (err) {
        console.error('Slack OAuth error:', err);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_error`);
      }

      if (!authData) {
        console.error('No auth data received from Slack');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_auth_data`);
      }

      const userId = req.session.pendingSlackAuth;
      if (!userId) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=no_user`);
      }

      const { profile, accessToken } = authData;

      // Update user with Slack credentials
      await User.findByIdAndUpdate(userId, {
        slack: {
          connected: true,
          accessToken: accessToken,
          teamId: profile.team?.id,
          teamName: profile.team?.name,
          userId: profile.user?.id,
          username: profile.user?.name,
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000))
        }
      });

      delete req.session.pendingSlackAuth;

      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connected=slack`);
    })(req, res);
  } catch (error) {
    console.error('Error in Slack callback:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=slack_setup`);
  }
});

// Disconnect Slack
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      slack: {
        connected: false,
        accessToken: null,
        teamId: null,
        teamName: null,
        userId: null,
        username: null,
        expiresAt: null
      }
    });

    res.json({ success: true, message: 'Slack disconnected' });
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

// Get Slack channels
router.get('/channels', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.slack?.connected || !user.slack?.accessToken) {
      return res.status(400).json({ error: 'Slack not connected' });
    }

    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.slack.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return res.status(400).json({ error: data.error });
    }

    const channels = data.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
      isMember: channel.is_member,
      memberCount: channel.num_members,
      topic: channel.topic?.value || '',
      purpose: channel.purpose?.value || ''
    }));

    res.json({ channels });
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get recent messages from a channel
router.get('/messages/:channelId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.slack?.connected || !user.slack?.accessToken) {
      return res.status(400).json({ error: 'Slack not connected' });
    }

    const { channelId } = req.params;
    const limit = req.query.limit || 10;

    const response = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.slack.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return res.status(400).json({ error: data.error });
    }

    const messages = data.messages.map(message => ({
      id: message.ts,
      text: message.text || '',
      user: message.user,
      timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
      type: message.type
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching Slack messages:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router; 