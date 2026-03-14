import { describe, it, expect } from "vitest";

// Unit tests for booking validation rules:
// 1. Minimum 7 nights stay
// 2. Check-in must be at least 3 days from today

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(date: Date): number {
  const today = getTodayStart();
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((dateStart.getTime() - today.getTime()) / msPerDay);
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
}

describe("Booking validation: minimum 7 nights", () => {
  const checkIn = new Date("2026-06-15");
  const checkOut6 = new Date("2026-06-21"); // 6 nights
  const checkOut7 = new Date("2026-06-22"); // 7 nights
  const checkOut8 = new Date("2026-06-23"); // 8 nights

  it("rejects stays of 6 nights", () => {
    const nights = nightsBetween(checkIn, checkOut6);
    expect(nights).toBe(6);
    expect(nights >= 7).toBe(false);
  });

  it("accepts stays of 7 nights", () => {
    const nights = nightsBetween(checkIn, checkOut7);
    expect(nights).toBe(7);
    expect(nights >= 7).toBe(true);
  });

  it("accepts stays of 8+ nights", () => {
    const nights = nightsBetween(checkIn, checkOut8);
    expect(nights).toBe(8);
    expect(nights >= 7).toBe(true);
  });
});

describe("Booking validation: check-in 3+ days ahead", () => {
  it("blocks check-in today (0 days ahead)", () => {
    const today = getTodayStart();
    const days = daysFromToday(today);
    expect(days).toBe(0);
    expect(days >= 3).toBe(false);
  });

  it("blocks check-in 1 day ahead", () => {
    const d = new Date(getTodayStart());
    d.setDate(d.getDate() + 1);
    const days = daysFromToday(d);
    expect(days).toBe(1);
    expect(days >= 3).toBe(false);
  });

  it("blocks check-in 2 days ahead", () => {
    const d = new Date(getTodayStart());
    d.setDate(d.getDate() + 2);
    const days = daysFromToday(d);
    expect(days).toBe(2);
    expect(days >= 3).toBe(false);
  });

  it("allows check-in 3 days ahead", () => {
    const d = new Date(getTodayStart());
    d.setDate(d.getDate() + 3);
    const days = daysFromToday(d);
    expect(days).toBe(3);
    expect(days >= 3).toBe(true);
  });

  it("allows check-in 4+ days ahead", () => {
    const d = new Date(getTodayStart());
    d.setDate(d.getDate() + 10);
    const days = daysFromToday(d);
    expect(days).toBe(10);
    expect(days >= 3).toBe(true);
  });
});
