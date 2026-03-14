import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateTotalForDateRange,
  invalidatePriceTableCache,
} from "../../server/services/price-table.service";

describe("Checkout pricing - full scenarios", () => {
  beforeEach(() => invalidatePriceTableCache());
  describe("Lykoskufi 2 - fixed price rooms", () => {
    it("7 nights in June = 7 × 140€ = 980€", () => {
      const checkIn = new Date(Date.UTC(2026, 5, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 5, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 2", checkIn, checkOut, 2);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(980);
    });

    it("7 nights in August = 7 × 160€ = 1120€", () => {
      const checkIn = new Date(Date.UTC(2026, 7, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 7, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 2", checkIn, checkOut, 2);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(1120);
    });

    it("9 nights April 1-10 = 9 × 120€ = 1080€", () => {
      const checkIn = new Date(Date.UTC(2026, 3, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 3, 10, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 2", checkIn, checkOut, 2);
      expect(nights).toBe(9);
      expect(totalPrice).toBe(1080);
    });
  });

  describe("Lykoskufi 5 - guest-based pricing", () => {
    it("7 nights in July with 4 guests = 7 × 350€ (6-tier)", () => {
      const checkIn = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 6, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 5", checkIn, checkOut, 4);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(7 * 350);
    });

    it("7 nights in July with 8 guests = 7 × 420€ (10-tier)", () => {
      const checkIn = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 6, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Lykoskufi 5", checkIn, checkOut, 8);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(7 * 420);
    });
  });

  describe("Small Bungalow - seasonal open/closed", () => {
    it("7 nights in July = 7 × 70€ = 490€", () => {
      const checkIn = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 6, 8, 12, 0, 0));
      const { totalPrice, nights } = calculateTotalForDateRange("Small Bungalow", checkIn, checkOut, 2);
      expect(nights).toBe(7);
      expect(totalPrice).toBe(490);
    });

    it("throws for April dates (closed)", () => {
      const checkIn = new Date(Date.UTC(2026, 3, 1, 12, 0, 0));
      const checkOut = new Date(Date.UTC(2026, 3, 8, 12, 0, 0));
      expect(() =>
        calculateTotalForDateRange("Small Bungalow", checkIn, checkOut, 2),
      ).toThrow("closed");
    });
  });

  describe("Date format YYYY-MM-DD parsing", () => {
    it("parseDateOnly equivalent: UTC noon gives correct calendar day", () => {
      const d = new Date(Date.UTC(2026, 5, 1, 12, 0, 0));
      expect(d.getUTCMonth()).toBe(5);
      expect(d.getUTCDate()).toBe(1);
    });
  });

  describe("Stripe amount calculation", () => {
    it("total 980.50€ → 98050 cents", () => {
      const euros = 980.5;
      const cents = Math.round(euros * 100);
      expect(cents).toBe(98050);
    });

    it("total 1080€ → 108000 cents", () => {
      const euros = 1080;
      const cents = Math.round(euros * 100);
      expect(cents).toBe(108000);
    });
  });
});
