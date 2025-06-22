import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SiGooglecalendar } from 'react-icons/si';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface GoogleCalendarIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function GoogleCalendarIntegration({ onConnectionChange }: GoogleCalendarIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setEmail(data.email);
        onConnectionChange?.(data.connected);
      }
    } catch (error) {
      console.error('Error checking Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/connect`;
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsConnected(false);
        setEmail(null);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  };

  useEffect(() => {
    checkConnectionStatus();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'google-calendar') {
      setTimeout(() => {
        checkConnectionStatus();
        window.history.replaceState({}, '', window.location.pathname);
      }, 1000);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border rounded-lg p-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connected</span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connected account: <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                You can now view your calendar events and create new meetings directly from Orbit.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                  Open Google Calendar
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Not Connected</span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to sync events and allow Orbit to create new meetings.
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full sm:w-auto"
            >
              <SiGooglecalendar className="h-4 w-4 mr-2" />
              {connecting ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="text-xs text-muted-foreground">
          <p>
            Orbit has permission to read your calendar events and create new events.
            You can revoke this access anytime from your{' '}
            <a 
              href="https://myaccount.google.com/permissions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Google Account settings
            </a>.
          </p>
        </div>
      )}
    </div>
  );
} 