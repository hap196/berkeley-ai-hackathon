import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SiGmail } from 'react-icons/si';

interface GmailIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
  onAccountChange?: (account: { email: string; connected: boolean } | null) => void;
  onDisconnectRequest?: (disconnectFn: () => Promise<void>) => void;
}

interface GmailEmail {
  id: string;
  subject: string;
  from: {
    name: string;
    email: string;
  };
  snippet: string;
  date: string;
  isRead: boolean;
  isImportant: boolean;
}

// **OPTIMIZATION: Add client-side caching**
const CACHE_KEY = 'gmail_emails_cache';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface CacheData {
  emails: GmailEmail[];
  timestamp: number;
}

export function GmailIntegration({ onConnectionChange, onAccountChange, onDisconnectRequest }: GmailIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const getCachedEmails = (): GmailEmail[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { emails, timestamp }: CacheData = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return emails;
        }
      }
    } catch (error) {
      console.error('Error reading email cache:', error);
    }
    return null;
  };

  // **OPTIMIZATION: Store emails in cache**
  const setCachedEmails = (emails: GmailEmail[]) => {
    try {
      const cacheData: CacheData = {
        emails,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error storing email cache:', error);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gmail/status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setEmail(data.email);
        onConnectionChange?.(data.connected);
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    // Redirect to Gmail OAuth
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gmail/connect`;
  };

  const handleDisconnect = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gmail/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsConnected(false);
        setEmail(null);
        setEmails([]);
        localStorage.removeItem(CACHE_KEY);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
  }, [onConnectionChange]);

  const fetchEmails = async () => {
    if (!isConnected) return;
    
    const cachedEmails = getCachedEmails();
    if (cachedEmails) {
      setEmails(cachedEmails);
      return;
    }

    setEmailsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gmail/emails`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
        setCachedEmails(data.emails);
      } else if (response.status === 401) {
        setIsConnected(false);
        setEmail(null);
        localStorage.removeItem(CACHE_KEY);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setEmailsLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'gmail') {
      setTimeout(() => {
        checkConnectionStatus();
        window.history.replaceState({}, '', window.location.pathname);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchEmails();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && email) {
      onAccountChange?.({ email, connected: true });
    } else {
      onAccountChange?.(null);
    }
  }, [isConnected, email, onAccountChange]);
  
  useEffect(() => {
    if (onDisconnectRequest) {
      onDisconnectRequest(handleDisconnect);
    }
  }, [handleDisconnect, onDisconnectRequest]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-8">
        <Button 
          onClick={handleConnect} 
          disabled={connecting}
          className="w-full sm:w-auto"
        >
          <SiGmail className="h-4 w-4 mr-2" />
          {connecting ? 'Connecting...' : 'Connect Gmail'}
        </Button>
      </div>
    );
  }

  if (emailsLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading emails...</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {emailsLoading && emails.length > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          Refreshing emails...
        </div>
      )}
      
      {emails.map((email) => (
        <div
          key={email.id}
          className="flex flex-col gap-2 border-b pl-4 pr-16 py-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0 w-full">
            <span className={`truncate flex-1 min-w-0 ${!email.isRead ? 'font-semibold' : ''}`}>
              {email.from.name || email.from.email}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDate(email.date)}
            </span>
          </div>
          <div className={`font-medium truncate w-full ${!email.isRead ? 'font-semibold' : ''}`}>
            {email.subject || '(No Subject)'}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2 w-full overflow-hidden">
            {email.snippet}
          </div>
        </div>
      ))}

      {emails.length === 0 && !emailsLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-muted-foreground">No emails found</div>
        </div>
      )}
    </div>
  );
} 