const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
};

// Check GitHub connection status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check if user has GitHub token with required scopes
    const hasRequiredScopes = user.accessToken && user.githubId;
    
    res.json({
      connected: hasRequiredScopes,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Get GitHub repositories for the authenticated user
router.get('/repos', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        sort: 'updated',
        per_page: 10,
        type: 'all'
      }
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      isPrivate: repo.private,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count
    }));

    res.json({ repos });
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'GitHub authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get GitHub issues
router.get('/issues', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const response = await axios.get('https://api.github.com/issues', {
      headers: {
        'Authorization': `token ${user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        filter: 'assigned',
        state: 'open',
        sort: 'updated',
        per_page: 20
      }
    });

    const issues = response.data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      url: issue.html_url,
      repository: {
        name: issue.repository.name,
        fullName: issue.repository.full_name,
        url: issue.repository.html_url
      },
      user: {
        login: issue.user.login,
        avatarUrl: issue.user.avatar_url
      },
      assignees: issue.assignees.map(assignee => ({
        login: assignee.login,
        avatarUrl: assignee.avatar_url
      })),
      labels: issue.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      commentsCount: issue.comments
    }));

    res.json({ issues });
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'GitHub authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get PRs
router.get('/pull-requests', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.accessToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }

    const searchPromises = [
      axios.get('https://api.github.com/search/issues', {
        headers: {
          'Authorization': `token ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          q: `type:pr author:${user.username} is:open`,
          sort: 'updated',
          order: 'desc',
          per_page: 20
        }
      }),
      axios.get('https://api.github.com/search/issues', {
        headers: {
          'Authorization': `token ${user.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          q: `type:pr involves:${user.username} is:open`,
          sort: 'updated',
          order: 'desc',
          per_page: 20
        }
      })
    ];

    const responses = await Promise.all(searchPromises.map(p => p.catch(e => ({ data: { items: [] } }))));
    
    const allPRs = new Map();
    
    responses.forEach(response => {
      if (response.data && response.data.items) {
        response.data.items.forEach(pr => {
          if (pr.user.login === user.username) {
            allPRs.set(pr.id, pr);
          }
        });
      }
    });

    const pullRequests = Array.from(allPRs.values()).map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      url: pr.html_url,
      repository: {
        name: pr.repository_url.split('/').pop(),
        fullName: pr.repository_url.split('/').slice(-2).join('/'),
        url: pr.repository_url.replace('api.github.com/repos', 'github.com')
      },
      user: {
        login: pr.user.login,
        avatarUrl: pr.user.avatar_url
      },
      labels: pr.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      commentsCount: pr.comments,
      isDraft: pr.draft
    }));

    pullRequests.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ pullRequests });
  } catch (error) {
    console.error('Error fetching GitHub pull requests:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'GitHub authentication expired' });
    }
    
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

module.exports = router; 