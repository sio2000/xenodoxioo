import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AvailabilityCalendarProps {
  onSelectDates?: (checkIn: Date, checkOut: Date) => void;
}

export default function AvailabilityCalendar({
  onSelectDates,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  // Booked dates for demo (in production, fetch from API)
  const bookedDates = new Set([
    new Date(2024, 10, 15).toDateString(),
    new Date(2024, 10, 16).toDateString(),
    new Date(2024, 10, 17).toDateString(),
    new Date(2024, 11, 20).toDateString(),
    new Date(2024, 11, 21).toDateString(),
  ]);

  const blockedDates = new Set([new Date(2024, 11, 25).toDateString()]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = selectedDate.toDateString();

    // Can't select booked or blocked dates
    if (bookedDates.has(dateStr) || blockedDates.has(dateStr)) {
      return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(selectedDate);
      setCheckOut(null);
    } else if (selectedDate > checkIn) {
      setCheckOut(selectedDate);
      onSelectDates?.(checkIn, selectedDate);
    } else {
      setCheckIn(selectedDate);
      setCheckOut(null);
    }
  };

  const isInRange = (day: number) => {
    if (!checkIn || !checkOut) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return date > checkIn && date < checkOut;
  };

  const isSelected = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = date.toDateString();
    return (
      checkIn?.toDateString() === dateStr ||
      checkOut?.toDateString() === dateStr
    );
  };

  const isBooked = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return bookedDates.has(date.toDateString());
  };

  const isBlocked = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    return blockedDates.has(date.toDateString());
  };

  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const calendarDays = [];
  const totalCells = firstDayOfMonth(currentMonth) + daysInMonth(currentMonth);

  for (let i = 0; i < firstDayOfMonth(currentMonth); i++) {
    calendarDays.push(null);
  }

  for (let i = 1; i <= daysInMonth(currentMonth); i++) {
    calendarDays.push(i);
  }

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">{monthName}</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {days.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-xs text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => day && handleDateClick(day)}
              disabled={!day || isBooked(day!) || isBlocked(day!)}
              className={`
                aspect-square text-sm font-medium rounded transition-all
                ${
                  !day || isBooked(day!) || isBlocked(day!)
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : isSelected(day!)
                      ? "bg-primary text-white"
                      : isInRange(day!)
                        ? "bg-primary/20 text-foreground"
                        : "hover:bg-muted text-foreground"
                }
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-border pt-4 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded" />
          <span className="text-foreground">Selected dates</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/20 rounded" />
          <span className="text-foreground">In range</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive rounded" />
          <span className="text-foreground">Unavailable</span>
        </div>
      </div>

      {/* Selected Dates Display */}
      {checkIn && checkOut && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your Dates:</p>
          <p className="font-semibold text-foreground">
            {checkIn.toLocaleDateString()} → {checkOut.toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {Math.ceil(
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
            )}{" "}
            nights
          </p>
        </div>
      )}
    </div>
  );
}
