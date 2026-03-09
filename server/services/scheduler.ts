import cron from "node-cron";
import { chargeScheduledPayments } from "./payment.service";

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;

export function startScheduler() {
  if (schedulerTask) {
    console.log("[SCHEDULER] Already running");
    return;
  }

  // Run every day at 08:00 UTC
  schedulerTask = cron.schedule("0 8 * * *", async () => {
    console.log(`[SCHEDULER] Running daily balance payment job at ${new Date().toISOString()}`);
    try {
      const result = await chargeScheduledPayments();
      console.log(`[SCHEDULER] Job completed:`, result);
    } catch (error: any) {
      console.error(`[SCHEDULER] Job failed:`, error.message);
    }
  });

  console.log("[SCHEDULER] Started — daily at 08:00 UTC");
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log("[SCHEDULER] Stopped");
  }
}

export default { startScheduler, stopScheduler };
