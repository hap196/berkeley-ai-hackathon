import React, { useState, useEffect, useRef } from 'react';
import { format, startOfDay, addHours, isSameDay } from 'date-fns';

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

interface CalendarDayViewProps {
  date?: Date;
  events: CalendarEvent[];
}

export function CalendarDayView({ date = new Date(), events }: CalendarDayViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots for full 24 hours (12 AM to 12 AM next day)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
      hour,
      time: `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`,
      fullTime: `${hour.toString().padStart(2, '0')}:00`
    };
  });

  // Calculate event positioning
  const getEventStyle = (event: CalendarEvent) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    
    // Calculate position from 12 AM (start of our view)
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    
    const top = Math.max(0, startHour * 60); // 60px per hour
    const height = Math.max(30, (endHour - startHour) * 60); // Minimum 30px height
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '60px', // Offset for time labels
      right: '10px'
    };
  };

  // Calculate current time indicator position
  const getCurrentTimePosition = () => {
    if (!isSameDay(currentTime, date)) return null;
    
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    const top = hours * 60;
    
    if (top < 0 || top > 24 * 60) return null; // Outside visible range
    
    return `${top}px`;
  };

  const currentTimePosition = getCurrentTimePosition();

  // Color mapping for events
  const getEventColor = (color: string) => {
    const colors = {
      default: 'bg-blue-500',
      '1': 'bg-blue-500',
      '2': 'bg-green-500',
      '3': 'bg-purple-500',
      '4': 'bg-red-500',
      '5': 'bg-yellow-500',
      '6': 'bg-orange-500',
      '7': 'bg-cyan-500',
      '8': 'bg-gray-500',
      '9': 'bg-indigo-500',
      '10': 'bg-pink-500',
      '11': 'bg-teal-500'
    };
    return colors[color as keyof typeof colors] || colors.default;
  };

  return (
    <div className="relative bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground font-medium">
              {format(date, 'EEE').toUpperCase()}
            </div>
            <div className="text-2xl font-bold">
              {format(date, 'd')}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative" ref={containerRef}>
        <div className="relative min-h-[1440px]"> {/* 24 hours * 60px */}
          {/* Time slots */}
          {timeSlots.map((slot, index) => (
            <div
              key={slot.hour}
              className="relative flex items-start border-b border-border/30"
              style={{ height: '60px' }}
            >
              <div className="w-14 text-xs text-muted-foreground text-right pr-2 pt-1">
                {slot.time}
              </div>
              <div className="flex-1 relative">
                {/* Hour line */}
                <div className="absolute top-0 left-0 w-full h-px bg-border/30" />
                {/* Half hour line */}
                <div className="absolute top-8 left-0 w-full h-px bg-border/20" />
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimePosition && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full ml-11 -mt-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {/* Events */}
          {events.map((event) => {
            const style = getEventStyle(event);
            const colorClass = getEventColor(event.color || 'default');
            
            return (
              <div
                key={event.id}
                className={`absolute z-20 rounded px-2 py-1 text-white text-xs cursor-pointer transition-all hover:shadow-lg ${colorClass}`}
                style={style}
                title={`${event.title}\n${event.description || ''}\n${event.location || ''}`}
              >
                <div className="font-medium truncate">{event.title}</div>
                {!event.isAllDay && (
                  <div className="text-white/80 truncate">
                    {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                  </div>
                )}
                {event.location && (
                  <div className="text-white/70 truncate mt-1">
                    📍 {event.location}
                  </div>
                )}
              </div>
            );
          })}

          {/* All-day events at top */}
          {events.filter(e => e.isAllDay).length > 0 && (
            <div className="absolute top-0 left-14 right-2 z-30">
              <div className="bg-background pb-2">
                {events.filter(e => e.isAllDay).map((event, index) => (
                  <div
                    key={event.id}
                    className={`rounded px-2 py-1 text-white text-xs mb-1 ${getEventColor(event.color || 'default')}`}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-white/80">All day</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 