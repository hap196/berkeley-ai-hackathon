import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SiGooglecalendar } from 'react-icons/si';
import { CalendarDayView } from './CalendarDayView';

interface GoogleCalendarIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
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

export function GoogleCalendarIntegration({ onConnectionChange }: GoogleCalendarIntegrationProps) {
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

  const handleDisconnect = async () => {
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
  };

  const fetchCalendarEvents = async (date?: Date) => {
    if (!isConnected) return;
    
    setEventsLoading(true);
    try {
      const dateParam = date ? date.toISOString().split('T')[0] : '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/google-calendar/events${dateParam ? `?date=${dateParam}` : ''}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
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