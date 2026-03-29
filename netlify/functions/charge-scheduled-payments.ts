/**
 * Netlify Scheduled Function: off-session balance charges for deposit-paid bookings.
 *
 * Schedule: daily 08:00 UTC (netlify.toml + export const config). Same cadence as Express node-cron.
 *
 * Logs (Netlify → Functions → charge-scheduled-payments → Logs):
 * - [charge-scheduled-payments] start … — run id + UTC day
 * - NETLIFY_BALANCE_SCHEDULER_RESULT — one JSON line for copy/paste (processed / failed / cancelled)
 *
 * Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (και ό,τι απαιτεί ήδη το payment.service / db).
 */
import { chargeScheduledPayments } from "../../server/services/payment.service";

export default async (_req?: Request) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const utcDay = new Date().toISOString().slice(0, 10);
  console.log(`[charge-scheduled-payments] start runId=${runId} utcDay=${utcDay}`);

  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    console.error(`[charge-scheduled-payments] Missing env: ${missing.join(", ")} — abort`);
    throw new Error(`charge-scheduled-payments: missing ${missing.join(", ")}`);
  }

  try {
    const result = await chargeScheduledPayments();
    const summary = {
      runId,
      utcDay,
      processed: result.processed,
      failed: result.failed,
      cancelled: result.cancelled,
    };
    console.log("[charge-scheduled-payments] done", summary);
    console.log(`NETLIFY_BALANCE_SCHEDULER_RESULT ${JSON.stringify(summary)}`);
    return;
  } catch (e: any) {
    console.error("[charge-scheduled-payments] Error:", e?.stack || e?.message || e);
    throw e;
  }
};

export const config = { schedule: "0 8 * * *" };
