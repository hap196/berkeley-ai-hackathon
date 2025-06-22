import { useState, useEffect, useCallback } from 'react';
import { SiGithub } from 'react-icons/si';
import { ExternalLink, GitPullRequest, AlertCircle, Calendar, MessageCircle } from 'lucide-react';

interface GitHubIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
  onAccountChange?: (account: { username: string; connected: boolean } | null) => void;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  repository: {
    name: string;
    fullName: string;
    url: string;
  };
  user: {
    login: string;
    avatarUrl: string;
  };
  assignees: Array<{
    login: string;
    avatarUrl: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  repository: {
    name: string;
    fullName: string;
    url: string;
  };
  user: {
    login: string;
    avatarUrl: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  isDraft: boolean;
}

// Client-side caching
const ISSUES_CACHE_KEY = 'github_issues_cache';
const PRS_CACHE_KEY = 'github_prs_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export function GitHubIntegration({ onConnectionChange, onAccountChange }: GitHubIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [prsLoading, setPrsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'prs'>('issues');

  // Cache helpers
  const getCachedData = <T,>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp }: CacheData<T> = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  const setCachedData = <T,>(key: string, data: T) => {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error storing cache:', error);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/github/status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setUsername(data.username);
        onConnectionChange?.(data.connected);
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    if (!isConnected) return;
    
    // Try to load from cache first
    const cachedIssues = getCachedData<GitHubIssue[]>(ISSUES_CACHE_KEY);
    if (cachedIssues) {
      setIssues(cachedIssues);
      return;
    }

    setIssuesLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/github/issues`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues);
        setCachedData(ISSUES_CACHE_KEY, data.issues);
      } else if (response.status === 401) {
        setIsConnected(false);
        setUsername(null);
        localStorage.removeItem(ISSUES_CACHE_KEY);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const fetchPullRequests = async () => {
    if (!isConnected) return;
    
    // Try to load from cache first
    const cachedPRs = getCachedData<GitHubPullRequest[]>(PRS_CACHE_KEY);
    if (cachedPRs) {
      setPullRequests(cachedPRs);
      return;
    }

    setPrsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/github/pull-requests`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPullRequests(data.pullRequests);
        setCachedData(PRS_CACHE_KEY, data.pullRequests);
      } else if (response.status === 401) {
        setIsConnected(false);
        setUsername(null);
        localStorage.removeItem(PRS_CACHE_KEY);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error fetching GitHub pull requests:', error);
    } finally {
      setPrsLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchIssues();
      fetchPullRequests();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && username) {
      onAccountChange?.({ username, connected: true });
    } else {
      onAccountChange?.(null);
    }
  }, [isConnected, username, onAccountChange]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <SiGithub className="h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">GitHub Integration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Already connected! Your GitHub data is available.
        </p>
        <p className="text-xs text-muted-foreground">
          Issues and pull requests will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'issues'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <AlertCircle className="h-4 w-4" />
            Issues ({issues.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'prs'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <GitPullRequest className="h-4 w-4" />
            PRs ({pullRequests.length})
          </div>
        </button>
      </div>

      {/* Loading indicators */}
      {((activeTab === 'issues' && issuesLoading && issues.length > 0) ||
        (activeTab === 'prs' && prsLoading && pullRequests.length > 0)) && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          Refreshing {activeTab === 'issues' ? 'issues' : 'pull requests'}...
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <>
          {issuesLoading && issues.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Loading issues...</div>
            </div>
          ) : issues.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">No open issues assigned to you</div>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col gap-2 border-b pl-4 pr-4 py-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                onClick={() => window.open(issue.url, '_blank')}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {truncateText(issue.title, 40)}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      #{issue.number} in {issue.repository.name}
                    </div>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {issue.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.name}
                            className="px-2 py-0.5 text-xs rounded-full text-white"
                            style={{ backgroundColor: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {issue.labels.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{issue.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(issue.updatedAt)}
                      </div>
                      {issue.commentsCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {issue.commentsCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Pull Requests Tab */}
      {activeTab === 'prs' && (
        <>
          {prsLoading && pullRequests.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Loading pull requests...</div>
            </div>
          ) : pullRequests.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">No open pull requests</div>
            </div>
          ) : (
            pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="flex flex-col gap-2 border-b pl-4 pr-4 py-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                onClick={() => window.open(pr.url, '_blank')}
              >
                <div className="flex items-start gap-2">
                  <GitPullRequest className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    pr.isDraft ? 'text-gray-500' : 'text-green-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {truncateText(pr.title, 40)}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      #{pr.number} in {pr.repository.name}
                      {pr.isDraft && ' • Draft'}
                    </div>
                    {pr.labels.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {pr.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.name}
                            className="px-2 py-0.5 text-xs rounded-full text-white"
                            style={{ backgroundColor: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {pr.labels.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{pr.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pr.updatedAt)}
                      </div>
                      {pr.commentsCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {pr.commentsCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
} 