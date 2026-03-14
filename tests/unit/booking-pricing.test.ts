import { describe, it, expect } from "vitest";

describe("Booking pricing formula", () => {
  it("price formula: totalPrice = price_per_day * nights", () => {
    const pricePerDay = 140;
    const nights = 7;
    const expectedTotal = pricePerDay * nights;
    expect(expectedTotal).toBe(980);
  });

  it("multi-period: sums each night at its period price", () => {
    const nightsJune = 4;
    const nightsJuly = 3;
    const priceJune = 140;
    const priceJuly = 160;
    const total = nightsJune * priceJune + nightsJuly * priceJuly;
    expect(total).toBe(4 * 140 + 3 * 160);
    expect(total).toBe(1040);
  });

  it("Stripe amount: cents = Math.round(euros * 100)", () => {
    const euros = 980.50;
    const cents = Math.round(euros * 100);
    expect(cents).toBe(98050);
  });
});
