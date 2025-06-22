const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  githubId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  avatarUrl: {
    type: String
  },
  profileUrl: {
    type: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  // Google Calendar integration
  googleCalendar: {
    connected: {
      type: Boolean,
      default: false
    },
    accessToken: {
      type: String
    },
    refreshToken: {
      type: String
    },
    email: {
      type: String
    },
    expiresAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 