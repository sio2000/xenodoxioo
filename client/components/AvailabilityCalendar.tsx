import { useState, useEffect, useRef } from "react";
import { apiUrl } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  isSeasonalBungalowUnit,
  isLocalDateInBungalowOpenSeason,
} from "@/lib/room-display-order";

const MIN_NIGHTS = 7;
const MIN_DAYS_AHEAD_FOR_CHECKIN = 3;

/** YYYY-MM-DD for a calendar cell built with local y/m/d (must not use toISOString — UTC shift breaks booked check). */
function localCalendarDayKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Each night stayed is check-in .. check-out (exclusive): same half-open semantics as API ranges [start, end). */
function stayRangeContainsOccupiedNight(
  checkIn: Date,
  checkOut: Date,
  occupiedRanges: { start: string; end: string }[],
): boolean {
  const cur = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  while (cur < end) {
    const key = localCalendarDayKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
    if (occupiedRanges.some((range) => key >= range.start && key < range.end)) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

/** Any stay night (check-in .. check-out exclusive) falls outside 1 Jun – 30 Sep for seasonal bungalows. */
function stayRangeContainsOffSeasonBungalowNight(checkIn: Date, checkOut: Date): boolean {
  const cur = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  while (cur < end) {
    if (!isLocalDateInBungalowOpenSeason(cur)) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

interface AvailabilityCalendarProps {
  unitId?: string;
  propertyName?: string;
  unitName?: string;
  onSelectDates?: (checkIn: Date, checkOut: Date) => void;
  onInvalidSelection?: () => void;
}

export default function AvailabilityCalendar({
  unitId,
  propertyName = "",
  unitName = "",
  onSelectDates,
  onInvalidSelection,
}: AvailabilityCalendarProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: string; end: string }[]>([]);
  const [occupancyReady, setOccupancyReady] = useState(() => !unitId);
  const [minNightsError, setMinNightsError] = useState(false);
  const [rangeContainsUnavailable, setRangeContainsUnavailable] = useState(false);
  const [rangeContainsOffSeason, setRangeContainsOffSeason] = useState(false);

  const seasonalBungalow = isSeasonalBungalowUnit(unitName, propertyName);

  const onSelectRef = useRef(onSelectDates);
  const onInvalidRef = useRef(onInvalidSelection);
  useEffect(() => {
    onSelectRef.current = onSelectDates;
    onInvalidRef.current = onInvalidSelection;
  });

  useEffect(() => {
    if (!unitId) {
      setOccupiedRanges([]);
      setOccupancyReady(true);
      return;
    }
    setOccupancyReady(false);
    const fetchOccupied = async () => {
      try {
        const res = await fetch(apiUrl(`/api/bookings/occupied-dates?unitId=${encodeURIComponent(unitId)}`));
        if (res.ok) {
          const json = await res.json();
          setOccupiedRanges(json.data || []);
        } else {
          setOccupiedRanges([]);
        }
      } catch {
        setOccupiedRanges([]);
      } finally {
        setOccupancyReady(true);
      }
    };
    fetchOccupied();
  }, [unitId]);

  // After occupancy is known, validate the full stay (all nights) and sync parent — covers slow fetch & iCal updates.
  useEffect(() => {
    if (!checkIn || !checkOut || !occupancyReady) return;

    const crosses =
      occupiedRanges.length > 0 && stayRangeContainsOccupiedNight(checkIn, checkOut, occupiedRanges);
    if (crosses) {
      setRangeContainsUnavailable(true);
      setRangeContainsOffSeason(false);
      setMinNightsError(false);
      onInvalidRef.current?.();
      return;
    }
    setRangeContainsUnavailable(false);

    if (seasonalBungalow && stayRangeContainsOffSeasonBungalowNight(checkIn, checkOut)) {
      setRangeContainsOffSeason(true);
      setMinNightsError(false);
      onInvalidRef.current?.();
      return;
    }
    setRangeContainsOffSeason(false);

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < MIN_NIGHTS) {
      setMinNightsError(true);
      onInvalidRef.current?.();
      return;
    }
    setMinNightsError(false);
    onSelectRef.current?.(checkIn, checkOut);
  }, [checkIn, checkOut, occupancyReady, occupiedRanges, seasonalBungalow]);

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
      setRangeContainsUnavailable(false);
      setRangeContainsOffSeason(false);
    } else if (selectedDate > checkIn) {
      setCheckOut(selectedDate);
      setMinNightsError(false);
      setRangeContainsUnavailable(false);
      setRangeContainsOffSeason(false);
    } else {
      setCheckIn(selectedDate);
      setCheckOut(null);
      setMinNightsError(false);
      setRangeContainsUnavailable(false);
      setRangeContainsOffSeason(false);
    }
  };

  const isInRange = (day: number) => {
    if (!checkIn || !checkOut) return false;
    if (rangeContainsUnavailable || rangeContainsOffSeason || minNightsError) return false;
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
    const dateStr = localCalendarDayKey(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
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

  const isClosedSeasonDay = (day: number) => {
    if (!seasonalBungalow) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return !isLocalDateInBungalowOpenSeason(date);
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
              disabled={!day || isBooked(day!) || isBlocked(day!) || isClosedSeasonDay(day!)}
              className={`
                aspect-square text-sm font-medium rounded transition-all
                ${
                  !day || isBooked(day!) || isBlocked(day!) || isClosedSeasonDay(day!)
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

      {rangeContainsUnavailable && checkIn && checkOut && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">{t("calendar.rangeContainsUnavailable")}</p>
        </div>
      )}

      {rangeContainsOffSeason && checkIn && checkOut && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">{t("calendar.rangeContainsClosedSeason")}</p>
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
        {seasonalBungalow && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded opacity-50" />
            <span className="text-muted-foreground">{t("calendar.closedSeasonLegend")}</span>
          </div>
        )}
      </div>

      {/* Selected Dates Display — hide summary when range is invalid */}
      {checkIn && checkOut && !minNightsError && !rangeContainsUnavailable && !rangeContainsOffSeason && (
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
