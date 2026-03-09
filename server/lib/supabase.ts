import { createClient } from '@supabase/supabase-js';
import "./env";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (typeof v === 'string' && v.length > 0) return v;
  throw new Error(
    [
      `${name} is required.`,
      '',
      'Create a `.env` file in the project root (do NOT commit it) and set:',
      `  ${name}=...`,
      '',
      'Supabase Dashboard → Settings → API:',
      '- Project URL → SUPABASE_URL',
      '- service_role key → SUPABASE_SERVICE_ROLE_KEY (server-only)',
    ].join('\n')
  );
}

const supabaseUrl = requiredEnv('SUPABASE_URL');
const supabaseServiceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client-side Supabase instance (for auth)
export const createClientSupabase = () => {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
};
