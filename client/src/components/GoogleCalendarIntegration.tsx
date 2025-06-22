import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SiGooglecalendar } from 'react-icons/si';
import { CalendarDayView } from './CalendarDayView';

interface GoogleCalendarIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
  onAccountChange?: (account: { email: string; connected: boolean } | null) => void;
  onDisconnectRequest?: (disconnectFn: () => Promise<void>) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  description?: string;
  location?: string;
  color?: string;
}

export function GoogleCalendarIntegration({ onConnectionChange, onAccountChange, onDisconnectRequest }: GoogleCalendarIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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
    // Redirect to Google Calendar OAuth
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/connect`;
  };

  const handleDisconnect = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsConnected(false);
        setEmail(null);
        setEvents([]);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  }, [onConnectionChange]);

  const fetchCalendarEvents = async (date?: Date) => {
    if (!isConnected) return;
    
    setEventsLoading(true);
    try {
      // Use current date
      const now = new Date();
      const targetDate = date || new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateParam = targetDate.toISOString().split('T')[0];
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/events?date=${dateParam}`,
        { credentials: 'include' }
      );
      
      // console.log('Calendar events response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        // console.log('Calendar events data:', data);
        setEvents(data.events);
              } else if (response.status === 401) {
          // Token expired, need to reconnect
          setIsConnected(false);
          setEmail(null);
          onConnectionChange?.(false);
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error);
    } finally {
      setEventsLoading(false);
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

  useEffect(() => {
    if (isConnected) {
      fetchCalendarEvents();
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
          <SiGooglecalendar className="h-4 w-4 mr-2" />
          {connecting ? 'Connecting...' : 'Connect Google Calendar'}
        </Button>
      </div>
    );
  }

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading calendar events...</div>
      </div>
    );
  }

  return <CalendarDayView events={events} />;
} 