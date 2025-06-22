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

const CACHE_KEY_PREFIX = 'calendar_events_cache_';
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheData {
  events: CalendarEvent[];
  timestamp: number;
}

export function GoogleCalendarIntegration({ onConnectionChange, onAccountChange, onDisconnectRequest }: GoogleCalendarIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getCachedEvents = (date: Date): CalendarEvent[] | null => {
    try {
      const dateKey = date.toISOString().split('T')[0];
      const cached = localStorage.getItem(CACHE_KEY_PREFIX + dateKey);
      if (cached) {
        const { events, timestamp }: CacheData = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return events;
        }
      }
    } catch (error) {
      console.error('Error reading calendar cache:', error);
    }
    return null;
  };

  const setCachedEvents = (events: CalendarEvent[], date: Date) => {
    try {
      const dateKey = date.toISOString().split('T')[0];
      const cacheData: CacheData = {
        events,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY_PREFIX + dateKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error storing calendar cache:', error);
    }
  };

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
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  }, [onConnectionChange]);

  const fetchEvents = async (date: Date = selectedDate) => {
    if (!isConnected) return;

    const cachedEvents = getCachedEvents(date);
    if (cachedEvents) {
      setEvents(cachedEvents);
      return;
    }

    setEventsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/events?date=${dateStr}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        setCachedEvents(data.events, date);
      } else if (response.status === 401) {
        setIsConnected(false);
        setEmail(null);
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
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
      fetchEvents(selectedDate);
    }
  }, [isConnected, selectedDate]);

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

  return (
    <div className="w-full h-full relative">
      {eventsLoading && events.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 text-xs text-muted-foreground bg-background border-b">
          Refreshing calendar...
        </div>
      )}
      
      <CalendarDayView 
        date={selectedDate} 
        events={events}
      />
      
      {eventsLoading && events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-sm text-muted-foreground">Loading events...</div>
        </div>
      )}
    </div>
  );
} 