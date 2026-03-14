import { describe, it, expect, beforeEach } from "vitest";
import {
  parsePriceTable,
  getPriceForDate,
  getMinimumPriceForRoom,
  isRoomClosedForDate,
  isRoomClosedForDateRange,
  calculateTotalForDateRange,
  invalidatePriceTableCache,
} from "../../server/services/price-table.service";

describe("Price Table Service", () => {
  beforeEach(() => {
    invalidatePriceTableCache();
  });

  describe("parsePriceTable", () => {
    it("parses all rooms from price table", () => {
      const table = parsePriceTable();
      expect(table.rooms.length).toBeGreaterThanOrEqual(6);
      const names = table.rooms.map((r) => r.roomName);
      expect(names).toContain("Lykoskufi 5");
      expect(names).toContain("Lykoskufi 2");
      expect(names).toContain("Lykoskufi 1");
      expect(names).toContain("Small Bungalow");
      expect(names).toContain("Big Bungalow");
      expect(names).toContain("Ogra House");
    });

    it("parses periods for each room", () => {
      const table = parsePriceTable();
      for (const room of table.rooms) {
        expect(room.periods.length).toBeGreaterThanOrEqual(5);
      }
    });

    it("identifies year-spanning period (20/12 – 07/01)", () => {
      const table = parsePriceTable();
      const room = table.rooms.find((r) => r.roomName === "Lykoskufi 2");
      expect(room).toBeDefined();
      const yearSpan = room!.periods.find((p) => p.spansYear);
      expect(yearSpan).toBeDefined();
      expect(yearSpan!.startMonth).toBe(12);
      expect(yearSpan!.startDay).toBe(20);
      expect(yearSpan!.endMonth).toBe(1);
      expect(yearSpan!.endDay).toBe(7);
    });
  });

  describe("getPriceForDate", () => {
    it("returns correct price for Lykoskufi 2 in June (140€)", () => {
      const date = new Date("2026-06-15");
      const { pricePerDay } = getPriceForDate("Lykoskufi 2", date, 2);
      expect(pricePerDay).toBe(140);
    });

    it("returns correct price for Lykoskufi 5 with 10 guests in July (420€)", () => {
      const date = new Date("2026-07-15");
      const { pricePerDay } = getPriceForDate("Lykoskufi 5", date, 10);
      expect(pricePerDay).toBe(420);
    });

    it("returns correct price for Lykoskufi 5 with 6 guests in July (350€)", () => {
      const date = new Date("2026-07-15");
      const { pricePerDay } = getPriceForDate("Lykoskufi 5", date, 6);
      expect(pricePerDay).toBe(350);
    });

    it("returns correct price for Lykoskufi 5 with 4 guests (uses 6-tier)", () => {
      const date = new Date("2026-07-15");
      const { pricePerDay } = getPriceForDate("Lykoskufi 5", date, 4);
      expect(pricePerDay).toBe(350);
    });

    it("returns correct price for Small Bungalow in July (70€)", () => {
      const date = new Date("2026-07-15");
      const { pricePerDay } = getPriceForDate("Small Bungalow", date, 2);
      expect(pricePerDay).toBe(70);
    });

    it("throws for Small Bungalow in January (closed)", () => {
      const date = new Date("2026-01-15");
      expect(() => getPriceForDate("Small Bungalow", date, 2)).toThrow("closed");
    });

    it("handles year-boundary period 20/12 – 07/01", () => {
      const decDate = new Date("2026-12-25");
      const { pricePerDay: p1 } = getPriceForDate("Lykoskufi 2", decDate, 2);
      expect(p1).toBe(140);

      const janDate = new Date("2027-01-05");
      const { pricePerDay: p2 } = getPriceForDate("Lykoskufi 2", janDate, 2);
      expect(p2).toBe(140);
    });

    it("matches room names case-insensitively", () => {
      const date = new Date("2026-06-15");
      const { pricePerDay } = getPriceForDate("ogra house", date, 6);
      expect(pricePerDay).toBe(220);
    });
  });

  describe("isRoomClosedForDate", () => {
    it("returns true for Small Bungalow in January", () => {
      const date = new Date("2026-01-15");
      expect(isRoomClosedForDate("Small Bungalow", date)).toBe(true);
    });

    it("returns false for Small Bungalow in July", () => {
      const date = new Date("2026-07-15");
      expect(isRoomClosedForDate("Small Bungalow", date)).toBe(false);
    });
  });

  describe("isRoomClosedForDateRange", () => {
    it("returns true when any night is closed", () => {
      const checkIn = new Date(Date.UTC(2026, 4, 28, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));
      expect(isRoomClosedForDateRange("Small Bungalow", checkIn, checkOut)).toBe(true);
    });

    it("returns false when all nights are open", () => {
      const checkIn = new Date("2026-07-01");
      const checkOut = new Date("2026-07-08");
      expect(isRoomClosedForDateRange("Small Bungalow", checkIn, checkOut)).toBe(false);
    });
  });

  describe("calculateTotalForDateRange", () => {
    it("calculates total for single-period stay", () => {
      const checkIn = new Date(Date.UTC(2026, 5, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 5, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 2", checkIn, checkOut, 2);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(7 * 140);
    });

    it("calculates total for multi-period stay (June + July)", () => {
      const checkIn = new Date(Date.UTC(2026, 5, 28, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 6, 5, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 2", checkIn, checkOut, 2);
      expect(nights).toBe(7);
      const expected = 3 * 140 + 4 * 160;
      expect(totalPrice).toBe(expected);
    });

    it("throws for closed room in date range", () => {
      const checkIn = new Date("2026-01-01");
      const checkOut = new Date("2026-01-08");
      expect(() =>
        calculateTotalForDateRange("Small Bungalow", checkIn, checkOut, 2),
      ).toThrow("closed");
    });
  });

  describe("getMinimumPriceForRoom", () => {
    it("returns minimum price for Lykoskufi 2 (120€ from 08/01-31/05)", () => {
      const min = getMinimumPriceForRoom("Lykoskufi 2");
      expect(min).toBe(120);
    });

    it("returns minimum price for Lykoskufi 5 (300€ from 6-guests tier)", () => {
      const min = getMinimumPriceForRoom("Lykoskufi 5");
      expect(min).toBe(300);
    });

    it("returns minimum for Small Bungalow (60€, excludes closed)", () => {
      const min = getMinimumPriceForRoom("Small Bungalow");
      expect(min).toBe(60);
    });

    it("returns null for unknown room", () => {
      const min = getMinimumPriceForRoom("Unknown Room XYZ");
      expect(min).toBeNull();
    });
  });
});
