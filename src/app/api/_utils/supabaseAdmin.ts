import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/types/supabase";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export class SupabaseAdminConfigError extends Error {
  debug?: Record<string, boolean>;

  constructor(message: string, debug?: Record<string, boolean>) {
    super(message);
    this.name = "SupabaseAdminConfigError";
    this.debug = debug;
  }
}

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const debug = {
      hasSUPABASE_URL: !!process.env.SUPABASE_URL,
      hasNEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
      hasSUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    };
    throw new SupabaseAdminConfigError(
      "Missing Supabase admin environment variables. Please set SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).",
      debug
    );
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}
