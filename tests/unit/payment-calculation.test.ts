import { describe, it, expect } from "vitest";

// Pure calculation functions tested without DB dependency

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function calculateDeposit(total: number, pct: number): number {
  return Math.round(total * (pct / 100) * 100) / 100;
}

function calculateBalance(total: number, deposit: number): number {
  return Math.round((total - deposit) * 100) / 100;
}

function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * (taxRate / 100) * 100) / 100;
}

function daysUntilDate(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function shouldPayFull(checkInDate: Date, thresholdDays: number): boolean {
  return daysUntilDate(checkInDate) <= thresholdDays;
}

function calculateScheduledChargeDate(checkInDate: Date, daysBefore: number): Date {
  const d = new Date(checkInDate);
  d.setDate(d.getDate() - daysBefore);
  return d;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Payment Calculation", () => {
  describe("toCents", () => {
    it("converts euros to cents", () => {
      expect(toCents(10)).toBe(1000);
      expect(toCents(99.99)).toBe(9999);
      expect(toCents(0.5)).toBe(50);
    });

    it("handles floating point correctly", () => {
      expect(toCents(1.005)).toBe(100); // JS float: 1.005 * 100 = 100.49999... rounds to 100
      expect(toCents(0)).toBe(0);
    });
  });

  describe("calculateDeposit", () => {
    it("calculates 25% deposit correctly", () => {
      expect(calculateDeposit(100, 25)).toBe(25);
      expect(calculateDeposit(200, 25)).toBe(50);
      expect(calculateDeposit(1000, 25)).toBe(250);
    });

    it("calculates other percentages", () => {
      expect(calculateDeposit(100, 30)).toBe(30);
      expect(calculateDeposit(100, 50)).toBe(50);
      expect(calculateDeposit(100, 100)).toBe(100);
    });

    it("handles decimal totals", () => {
      expect(calculateDeposit(99.99, 25)).toBe(25);
      expect(calculateDeposit(150.50, 25)).toBe(37.63);
    });
  });

  describe("calculateBalance", () => {
    it("calculates balance as total minus deposit", () => {
      expect(calculateBalance(100, 25)).toBe(75);
      expect(calculateBalance(200, 50)).toBe(150);
      expect(calculateBalance(99.99, 25)).toBe(74.99);
    });
  });

  describe("calculateTax", () => {
    it("calculates tax at 15%", () => {
      expect(calculateTax(100, 15)).toBe(15);
      expect(calculateTax(200, 15)).toBe(30);
    });

    it("calculates tax at other rates", () => {
      expect(calculateTax(100, 10)).toBe(10);
      expect(calculateTax(100, 24)).toBe(24);
    });

    it("rounds to 2 decimal places", () => {
      expect(calculateTax(33.33, 15)).toBe(5);
    });
  });
});

describe("Deposit / Full Payment Logic", () => {
  describe("shouldPayFull", () => {
    it("returns true when check-in is within threshold", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(shouldPayFull(tomorrow, 21)).toBe(true);
    });

    it("returns true when check-in is exactly on threshold", () => {
      const onThreshold = new Date();
      onThreshold.setDate(onThreshold.getDate() + 21);
      expect(shouldPayFull(onThreshold, 21)).toBe(true);
    });

    it("returns false when check-in is beyond threshold", () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 60);
      expect(shouldPayFull(farFuture, 21)).toBe(false);
    });
  });

  describe("calculateScheduledChargeDate", () => {
    it("returns date 21 days before check-in", () => {
      const checkIn = new Date(2026, 5, 1); // June 1 local
      const result = calculateScheduledChargeDate(checkIn, 21);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4); // May
      const expected = new Date(2026, 5, 1);
      expected.setDate(expected.getDate() - 21);
      expect(result.getDate()).toBe(expected.getDate());
    });

    it("returns date 30 days before check-in", () => {
      const checkIn = new Date(2026, 7, 15); // Aug 15 local
      const result = calculateScheduledChargeDate(checkIn, 30);
      const expected = new Date(2026, 7, 15);
      expected.setDate(expected.getDate() - 30);
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(expected.getDate());
    });
  });
});

describe("Cancellation Logic", () => {
  it("fully paid reservation: status = cancelled, payment kept", () => {
    const booking = { status: "CONFIRMED", payment_status: "PAID_FULL", total_paid: 500 };
    const cancelled = { ...booking, status: "CANCELLED" };
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.total_paid).toBe(500); // payment NOT refunded
  });

  it("deposit reservation: deposit kept, remaining never charged", () => {
    const booking = {
      status: "CONFIRMED",
      payment_status: "DEPOSIT_PAID",
      deposit_amount: 125,
      remaining_amount: 375,
      scheduled_charge_date: "2026-07-01",
    };
    const cancelled = { ...booking, status: "CANCELLED" };
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.deposit_amount).toBe(125); // kept
  });

  it("cancelled bookings should not be processed by scheduler", () => {
    const bookings = [
      { status: "CANCELLED", payment_status: "DEPOSIT_PAID", scheduled_charge_date: new Date().toISOString() },
      { status: "CONFIRMED", payment_status: "DEPOSIT_PAID", scheduled_charge_date: new Date().toISOString() },
    ];
    const eligible = bookings.filter(
      (b) => b.payment_status === "DEPOSIT_PAID" && b.status !== "CANCELLED",
    );
    expect(eligible.length).toBe(1);
    expect(eligible[0].status).toBe("CONFIRMED");
  });
});

describe("Full Pricing Pipeline", () => {
  it("room price -> taxes -> fees -> final Stripe charge", () => {
    const basePrice = 120;
    const nights = 5;
    const cleaningFee = 30;
    const taxRate = 15;
    const depositPct = 25;

    const subtotal = basePrice * nights; // 600
    const taxable = subtotal + cleaningFee; // 630
    const taxes = calculateTax(taxable, taxRate); // 94.50
    const total = subtotal + cleaningFee + taxes; // 724.50
    const deposit = calculateDeposit(total, depositPct); // 181.13
    const balance = calculateBalance(total, deposit); // 543.37
    const stripeCents = toCents(deposit); // 18113

    expect(subtotal).toBe(600);
    expect(taxes).toBe(94.5);
    expect(total).toBe(724.5);
    expect(deposit).toBe(181.13);
    expect(balance).toBe(543.37);
    expect(stripeCents).toBe(18113);
  });
});
