import https from "https";

const supabaseUrl = "jkolkjvhlguaqcfgaaig.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2xranZobGd1YXFjZmdhYWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NTkxNywiZXhwIjoyMDg4MDMxOTE3fQ.5D-FyZYezZ1w4HOPQco3XMjBJUrL52LbZudwR8WH8kU";

const statements = [
  `CREATE TABLE IF NOT EXISTS public.payment_settings (
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
  )`,
  `INSERT INTO public.payment_settings (deposit_percentage, balance_charge_days_before, full_payment_threshold_days, refund_deposit_on_cancel, currency)
   SELECT 25, 21, 21, false, 'EUR'
   WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE is_active = true)`,
  `CREATE TABLE IF NOT EXISTS public.inquiries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    checkin_date timestamp with time zone NOT NULL,
    checkout_date timestamp with time zone NOT NULL,
    guests integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'NEW',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT inquiries_pkey PRIMARY KEY (id),
    CONSTRAINT inquiries_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.inquiry_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inquiry_id uuid NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('guest', 'host')),
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id),
    CONSTRAINT inquiry_messages_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE CASCADE
  )`,
  `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id text`,
  `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_setup_intent_id text`,
  `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'DEPOSIT'`,
  `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS scheduled_charge_date timestamp with time zone`,
  `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT 0`,
];

function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opts = {
      hostname: supabaseUrl,
      port: 443,
      path: "/rest/v1/rpc/exec_sql",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("Applying migration via Supabase SQL...\n");

  // Try the direct SQL approach first
  const result = await execSQL(statements[0]);
  if (result.status === 404) {
    console.log("Supabase RPC exec_sql not available.");
    console.log("\n=== MANUAL MIGRATION REQUIRED ===");
    console.log("Go to: https://supabase.com/dashboard/project/jkolkjvhlguaqcfgaaig/sql/new");
    console.log("Paste the contents of migration-payment-inquiry.sql and click Run");
    console.log("=================================\n");
    return;
  }

  for (let i = 0; i < statements.length; i++) {
    try {
      const r = await execSQL(statements[i]);
      console.log(`Statement ${i + 1}: ${r.status === 200 ? "OK" : r.body.substring(0, 100)}`);
    } catch (e) {
      console.error(`Statement ${i + 1} failed:`, e.message);
    }
  }

  console.log("\nMigration complete!");
}

main().catch(console.error);
