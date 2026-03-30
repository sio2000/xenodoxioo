import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env (see .env.example).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("Running migration...");

  // 1. Create payment_settings table via RPC
  const { error: rpcError } = await supabase.rpc("exec_sql" as any, {
    sql: `
      CREATE TABLE IF NOT EXISTS public.payment_settings (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        deposit_percentage numeric NOT NULL DEFAULT 25,
        balance_charge_days_before integer NOT NULL DEFAULT 21,
        full_payment_threshold_days integer NOT NULL DEFAULT 21,
        refund_deposit_on_cancel boolean NOT NULL DEFAULT false,
        currency text NOT NULL DEFAULT 'EUR',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT payment_settings_pkey PRIMARY KEY (id)
      );
    `,
  });

  if (rpcError) {
    console.log("RPC not available (normal for Supabase). Using REST approach.");
    console.log("=== MANUAL MIGRATION REQUIRED ===");
    console.log("Please run the SQL from migration-payment-inquiry.sql in the Supabase SQL Editor.");
    console.log("Supabase Dashboard -> SQL Editor -> New Query -> Paste and run the SQL");
    console.log("=================================");

    // Try to insert into payment_settings anyway (might already exist)
    const { error: insertErr } = await supabase.from("payment_settings").insert({
      deposit_percentage: 25,
      balance_charge_days_before: 21,
      full_payment_threshold_days: 21,
      refund_deposit_on_cancel: false,
      currency: "EUR",
      is_active: true,
    });

    if (insertErr) {
      console.log("payment_settings insert error:", insertErr.code, insertErr.message);
    } else {
      console.log("payment_settings default record inserted");
    }

    return;
  }

  console.log("Migration completed successfully!");
}

runMigration().catch(console.error);
