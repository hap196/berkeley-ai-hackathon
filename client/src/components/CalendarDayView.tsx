import { useState, useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";

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

export function CalendarDayView({
  date = new Date(),
  events,
}: CalendarDayViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots for 24 hours
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
      hour,
      time: `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${
        hour >= 12 ? "PM" : "AM"
      }`,
      fullTime: `${hour.toString().padStart(2, "0")}:00`,
    };
  });

  // Check if two events overlap
  const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
    if (event1.isAllDay || event2.isAllDay) return false;
    
    const start1 = new Date(event1.start);
    const end1 = new Date(event1.end);
    const start2 = new Date(event2.start);
    const end2 = new Date(event2.end);
    
    return start1 < end2 && start2 < end1;
  };

  // Calculate overlapping groups and positions
  const calculateEventLayout = () => {
    const nonAllDayEvents = events.filter(event => !event.isAllDay);
    const eventLayout = new Map();

    const sortedEvents = [...nonAllDayEvents].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const overlapGroups: CalendarEvent[][] = [];
    
    for (const event of sortedEvents) {
      let addedToGroup = false;
      
      for (const group of overlapGroups) {
        const overlapsWithGroup = group.some(groupEvent => eventsOverlap(event, groupEvent));
        if (overlapsWithGroup) {
          group.push(event);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        overlapGroups.push([event]);
      }
    }

    overlapGroups.forEach(group => {
      const groupSize = group.length;
      group.forEach((event, index) => {
        if (groupSize === 1) {
          eventLayout.set(event.id, {
            column: index,
            totalColumns: groupSize,
            width: 100,
            left: 0
          });
        } else {
          const eventWidth = 70;
          const offsetPerEvent = 30;
          const adjustedWidth = Math.min(eventWidth, 100 - (index * offsetPerEvent));
          
          eventLayout.set(event.id, {
            column: index,
            totalColumns: groupSize,
            width: adjustedWidth,
            left: index * offsetPerEvent
          });
        }
      });
    });

    return eventLayout;
  };

  const eventLayout = calculateEventLayout();

  const getEventStyle = (event: CalendarEvent, eventIndex: number) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const top = Math.max(0, startHour * 60);
    const height = Math.max(30, (endHour - startHour) * 60);

    const layout = eventLayout.get(event.id);
    
    if (!layout || event.isAllDay) {
      return {
        top: `${top}px`,
        height: `${height}px`,
        left: "0px",
        right: "12px",
      };
    }

    const widthPercent = layout.width;
    const leftPercent = layout.left;
    
    const adjustedWidth = layout.left + layout.width >= 95 ? 
      Math.max(30, 100 - layout.left - 3) : 
      layout.width;

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${leftPercent}%`,
      width: `${adjustedWidth}%`,
      marginRight: "12px",
    };
  };

  const getCurrentTimePosition = () => {
    if (!isSameDay(currentTime, date)) return null;

    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    const top = hours * 60;

    if (top < 0 || top > 24 * 60) return null;

    return `${top}px`;
  };

  const currentTimePosition = getCurrentTimePosition();

  const getEventColor = (color: string) => {
    const colors = {
      default: "bg-blue-500",
      "1": "bg-blue-500",
      "2": "bg-green-500",
      "3": "bg-purple-500",
      "4": "bg-red-500",
      "5": "bg-yellow-500",
      "6": "bg-orange-500",
      "7": "bg-cyan-500",
      "8": "bg-gray-500",
      "9": "bg-indigo-500",
      "10": "bg-pink-500",
      "11": "bg-teal-500",
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
              {format(date, "EEE").toUpperCase()}
            </div>
            <div className="text-2xl font-bold">{format(date, "d")}</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative -mt-px" ref={containerRef}>
        <div className="flex min-h-[1440px]">
          {" "}
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 relative">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.hour}
                className="relative"
                style={{ height: "60px" }}
              >
                {index === 0 ? (
                  <div className="absolute top-2 right-3 text-xs text-muted-foreground">
                    {slot.time}
                  </div>
                ) : (
                  <div className="absolute -top-2 right-3 text-xs text-muted-foreground">
                    {slot.time}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="w-px bg-border flex-shrink-0"></div>
          <div className="flex-1 relative">
            {timeSlots.map((slot, index) => (
              <div
                key={`line-${slot.hour}`}
                className="relative"
                style={{ height: "60px" }}
              >
                <div className="absolute top-0 left-0 w-full h-px bg-border" />
                <div className="absolute top-8 left-0 w-full h-px bg-border/40" />
              </div>
            ))}
            {/* Current time indicator */}
            {currentTimePosition && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="h-0.5 bg-red-500 w-full" />
              </div>
            )}

            {/* Events */}
            {events.map((event, index) => {
              const style = getEventStyle(event, index);
              const colorClass = getEventColor(event.color || "default");
              const layout = eventLayout.get(event.id);
              const zIndex = layout ? 20 + layout.column : 20;

              return (
                <div
                  key={event.id}
                  className={`absolute rounded px-2 py-1 text-white text-xs cursor-pointer transition-all hover:shadow-lg ${colorClass}`}
                  style={{...style, zIndex}}
                  title={`${event.title}\n${event.description || ""}\n${
                    event.location || ""
                  }`}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  {!event.isAllDay && (
                    <div className="text-white/80 truncate">
                      {format(new Date(event.start), "h:mm a")} -{" "}
                      {format(new Date(event.end), "h:mm a")}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-white/70 truncate mt-1">
                      {event.location}
                    </div>
                  )}
                </div>
              );
            })}

            {/* All-day events at top */}
            {events.filter((e) => e.isAllDay).length > 0 && (
              <div className="absolute top-0 left-2 right-2 z-30">
                <div className="bg-background pb-2">
                  {events
                    .filter((e) => e.isAllDay)
                    .map((event, index) => (
                      <div
                        key={event.id}
                        className={`rounded px-2 py-1 text-white text-xs mb-1 ${getEventColor(
                          event.color || "default"
                        )}`}
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
    </div>
  );
}
