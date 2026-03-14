import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const MIN_NIGHTS = 7;
const MIN_DAYS_AHEAD_FOR_CHECKIN = 3;

interface AvailabilityCalendarProps {
  unitId?: string;
  onSelectDates?: (checkIn: Date, checkOut: Date) => void;
  onInvalidSelection?: () => void;
}

export default function AvailabilityCalendar({
  unitId,
  onSelectDates,
  onInvalidSelection,
}: AvailabilityCalendarProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: string; end: string }[]>([]);
  const [minNightsError, setMinNightsError] = useState(false);

  useEffect(() => {
    if (!unitId) {
      setOccupiedRanges([]);
      return;
    }
    const fetchOccupied = async () => {
      try {
        const res = await fetch(apiUrl(`/api/bookings/occupied-dates?unitId=${encodeURIComponent(unitId)}`));
        if (res.ok) {
          const json = await res.json();
          setOccupiedRanges(json.data || []);
        }
      } catch {
        setOccupiedRanges([]);
      }
    };
    fetchOccupied();
  }, [unitId]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(selectedDate);
      setCheckOut(null);
      setMinNightsError(false);
    } else if (selectedDate > checkIn) {
      const nights = Math.ceil((selectedDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (nights < MIN_NIGHTS) {
        setCheckOut(selectedDate);
        setMinNightsError(true);
        onInvalidSelection?.();
      } else {
        setCheckOut(selectedDate);
        setMinNightsError(false);
        onSelectDates?.(checkIn, selectedDate);
      }
    } else {
      setCheckIn(selectedDate);
      setCheckOut(null);
      setMinNightsError(false);
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
    const dateStr = date.toISOString().slice(0, 10);
    return occupiedRanges.some((range) => {
      return dateStr >= range.start && dateStr < range.end;
    });
  };

  const isBlocked = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const today = getTodayStart();
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysFromToday = Math.floor((dateStart.getTime() - today.getTime()) / msPerDay);
    return daysFromToday < MIN_DAYS_AHEAD_FOR_CHECKIN;
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

      {/* Min nights error label */}
      {minNightsError && checkIn && checkOut && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            {t("calendar.minNightsRequired")}
          </p>
        </div>
      )}

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
        {occupiedRanges.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded opacity-50" />
            <span className="text-muted-foreground">{t("calendar.bookedUnavailable")}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("calendar.checkInAdvanceDays")}</span>
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
