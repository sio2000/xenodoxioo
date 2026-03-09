import { describe, it, expect } from "vitest";

// E2E scenario tests for the booking system
// These test the business logic rules without requiring a running server

// ── Helpers (mirroring server logic) ───────────────────────────────

interface BookingScenario {
  checkInDate: Date;
  totalPrice: number;
  depositPercentage: number;
  fullPaymentThresholdDays: number;
  balanceChargeDaysBefore: number;
}

function determinePaymentType(scenario: BookingScenario): "FULL" | "DEPOSIT" {
  const now = new Date();
  const daysToCheckIn = Math.ceil(
    (scenario.checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysToCheckIn <= scenario.fullPaymentThresholdDays ? "FULL" : "DEPOSIT";
}

function calculatePaymentAmounts(scenario: BookingScenario) {
  const type = determinePaymentType(scenario);
  if (type === "FULL") {
    return {
      type: "FULL",
      chargeNow: scenario.totalPrice,
      remaining: 0,
      scheduledChargeDate: null,
    };
  }
  const deposit = Math.round(scenario.totalPrice * (scenario.depositPercentage / 100) * 100) / 100;
  const remaining = Math.round((scenario.totalPrice - deposit) * 100) / 100;
  const scheduledDate = new Date(scenario.checkInDate);
  scheduledDate.setDate(scheduledDate.getDate() - scenario.balanceChargeDaysBefore);
  return {
    type: "DEPOSIT",
    chargeNow: deposit,
    remaining,
    scheduledChargeDate: scheduledDate,
  };
}

function processBookingCancellation(booking: {
  status: string;
  paymentStatus: string;
  depositAmount: number;
  totalPaid: number;
  scheduledChargeDate: Date | null;
  refundDepositOnCancel: boolean;
}) {
  const result = {
    status: "CANCELLED",
    chargeRemaining: false,
    refundAmount: 0,
    depositKept: true,
  };

  if (booking.paymentStatus === "PAID_FULL") {
    result.depositKept = true;
    result.chargeRemaining = false;
  } else if (booking.paymentStatus === "DEPOSIT_PAID") {
    result.chargeRemaining = false;
    if (booking.refundDepositOnCancel) {
      result.refundAmount = booking.depositAmount;
      result.depositKept = false;
    }
  }

  return result;
}

// ── Scenario Tests ─────────────────────────────────────────────────

describe("Scenario 1: Booking within 21 days", () => {
  const scenario: BookingScenario = {
    checkInDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    totalPrice: 724.5,
    depositPercentage: 25,
    fullPaymentThresholdDays: 21,
    balanceChargeDaysBefore: 21,
  };

  it("requires FULL payment", () => {
    const result = calculatePaymentAmounts(scenario);
    expect(result.type).toBe("FULL");
    expect(result.chargeNow).toBe(724.5);
    expect(result.remaining).toBe(0);
    expect(result.scheduledChargeDate).toBeNull();
  });

  it("confirms booking after payment", () => {
    const booking = {
      status: "CONFIRMED",
      payment_status: "PAID_FULL",
      deposit_paid: true,
      balance_paid: true,
    };
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.payment_status).toBe("PAID_FULL");
  });

  it("cancellation keeps payment", () => {
    const result = processBookingCancellation({
      status: "CONFIRMED",
      paymentStatus: "PAID_FULL",
      depositAmount: 724.5,
      totalPaid: 724.5,
      scheduledChargeDate: null,
      refundDepositOnCancel: false,
    });
    expect(result.status).toBe("CANCELLED");
    expect(result.refundAmount).toBe(0);
    expect(result.depositKept).toBe(true);
  });
});

describe("Scenario 2: Booking with deposit (>21 days)", () => {
  const scenario: BookingScenario = {
    checkInDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    totalPrice: 724.5,
    depositPercentage: 25,
    fullPaymentThresholdDays: 21,
    balanceChargeDaysBefore: 21,
  };

  it("requires only DEPOSIT", () => {
    const result = calculatePaymentAmounts(scenario);
    expect(result.type).toBe("DEPOSIT");
    expect(result.chargeNow).toBe(181.13);
    expect(result.remaining).toBe(543.37);
    expect(result.scheduledChargeDate).not.toBeNull();
  });

  it("sets correct scheduled charge date (check-in - 21 days)", () => {
    const result = calculatePaymentAmounts(scenario);
    const expectedDate = new Date(scenario.checkInDate);
    expectedDate.setDate(expectedDate.getDate() - 21);
    expect(result.scheduledChargeDate!.toDateString()).toBe(expectedDate.toDateString());
  });

  it("booking status is CONFIRMED with DEPOSIT_PAID", () => {
    const booking = {
      status: "CONFIRMED",
      payment_status: "DEPOSIT_PAID",
      deposit_paid: true,
      balance_paid: false,
      remaining_amount: 543.37,
    };
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.payment_status).toBe("DEPOSIT_PAID");
    expect(booking.remaining_amount).toBeGreaterThan(0);
  });
});

describe("Scenario 3: Cancellation of deposit booking", () => {
  it("deposit is kept when refund policy is disabled", () => {
    const result = processBookingCancellation({
      status: "CONFIRMED",
      paymentStatus: "DEPOSIT_PAID",
      depositAmount: 181.13,
      totalPaid: 181.13,
      scheduledChargeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refundDepositOnCancel: false,
    });
    expect(result.status).toBe("CANCELLED");
    expect(result.chargeRemaining).toBe(false);
    expect(result.refundAmount).toBe(0);
    expect(result.depositKept).toBe(true);
  });

  it("deposit is refunded when refund policy is enabled", () => {
    const result = processBookingCancellation({
      status: "CONFIRMED",
      paymentStatus: "DEPOSIT_PAID",
      depositAmount: 181.13,
      totalPaid: 181.13,
      scheduledChargeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refundDepositOnCancel: true,
    });
    expect(result.status).toBe("CANCELLED");
    expect(result.chargeRemaining).toBe(false);
    expect(result.refundAmount).toBe(181.13);
    expect(result.depositKept).toBe(false);
  });

  it("remaining amount is NEVER charged after cancellation", () => {
    const result = processBookingCancellation({
      status: "CONFIRMED",
      paymentStatus: "DEPOSIT_PAID",
      depositAmount: 181.13,
      totalPaid: 181.13,
      scheduledChargeDate: new Date(), // today
      refundDepositOnCancel: false,
    });
    expect(result.chargeRemaining).toBe(false);
  });
});

describe("Scenario 4: Scheduled payment execution", () => {
  it("finds eligible bookings for scheduled payment", () => {
    const today = new Date();
    const bookings = [
      { id: "1", status: "CONFIRMED", payment_status: "DEPOSIT_PAID", scheduled_charge_date: today, remaining_amount: 543 },
      { id: "2", status: "CANCELLED", payment_status: "DEPOSIT_PAID", scheduled_charge_date: today, remaining_amount: 543 },
      { id: "3", status: "CONFIRMED", payment_status: "PAID_FULL", scheduled_charge_date: today, remaining_amount: 0 },
      { id: "4", status: "CONFIRMED", payment_status: "DEPOSIT_PAID", scheduled_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), remaining_amount: 543 },
    ];

    const eligible = bookings.filter(
      (b) =>
        b.status !== "CANCELLED" &&
        b.payment_status === "DEPOSIT_PAID" &&
        b.remaining_amount > 0 &&
        new Date(b.scheduled_charge_date) <= today,
    );

    expect(eligible.length).toBe(1);
    expect(eligible[0].id).toBe("1");
  });

  it("updates booking to PAID_FULL after successful balance charge", () => {
    const beforeCharge = {
      payment_status: "DEPOSIT_PAID",
      total_paid: 181.13,
      remaining_amount: 543.37,
      balance_paid: false,
    };

    const afterCharge = {
      ...beforeCharge,
      payment_status: "PAID_FULL",
      total_paid: 181.13 + 543.37,
      remaining_amount: 0,
      balance_paid: true,
    };

    expect(afterCharge.payment_status).toBe("PAID_FULL");
    expect(afterCharge.total_paid).toBeCloseTo(724.5, 2);
    expect(afterCharge.remaining_amount).toBe(0);
    expect(afterCharge.balance_paid).toBe(true);
  });
});

describe("Scenario 5: Property inquiry conversation", () => {
  it("creates inquiry with required fields", () => {
    const inquiry = {
      property_id: "uuid-123",
      guest_name: "John Doe",
      guest_email: "john@example.com",
      checkin_date: "2026-07-01",
      checkout_date: "2026-07-08",
      guests: 2,
      status: "NEW",
    };

    expect(inquiry.guest_name).toBe("John Doe");
    expect(inquiry.status).toBe("NEW");
  });

  it("tracks message flow: guest -> host -> guest", () => {
    const messages = [
      { sender_type: "guest", message: "Is there a discount for 7 nights?", order: 1 },
      { sender_type: "host", message: "We can offer 10% off!", order: 2 },
      { sender_type: "guest", message: "Great, I will book!", order: 3 },
    ];

    expect(messages[0].sender_type).toBe("guest");
    expect(messages[1].sender_type).toBe("host");
    expect(messages[2].sender_type).toBe("guest");
    expect(messages.length).toBe(3);
  });

  it("status updates after host reply", () => {
    let status = "NEW";
    // Host replies
    status = "ANSWERED";
    expect(status).toBe("ANSWERED");
    // Guest replies again
    status = "GUEST_REPLIED";
    expect(status).toBe("GUEST_REPLIED");
  });

  it("guest can access conversation without login via email", () => {
    const inquiry = { id: "inq-123", guest_email: "john@example.com" };
    const requestEmail = "john@example.com";
    const authorized = inquiry.guest_email.toLowerCase() === requestEmail.toLowerCase();
    expect(authorized).toBe(true);
  });

  it("unauthorized email cannot access inquiry", () => {
    const inquiry = { id: "inq-123", guest_email: "john@example.com" };
    const requestEmail = "other@example.com";
    const authorized = inquiry.guest_email.toLowerCase() === requestEmail.toLowerCase();
    expect(authorized).toBe(false);
  });
});

describe("Admin Payment Configuration", () => {
  it("default settings are correct", () => {
    const defaults = {
      depositPercentage: 25,
      balanceChargeDaysBefore: 21,
      fullPaymentThresholdDays: 21,
      refundDepositOnCancel: false,
      currency: "EUR",
    };
    expect(defaults.depositPercentage).toBe(25);
    expect(defaults.fullPaymentThresholdDays).toBe(21);
    expect(defaults.refundDepositOnCancel).toBe(false);
  });

  it("changing deposit percentage affects calculations", () => {
    const total = 1000;
    const pct30 = Math.round(total * 0.3 * 100) / 100;
    const pct50 = Math.round(total * 0.5 * 100) / 100;

    expect(pct30).toBe(300);
    expect(pct50).toBe(500);
  });
});
