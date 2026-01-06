import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/types/supabase";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export class SupabaseAdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAdminConfigError";
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
    throw new SupabaseAdminConfigError(
      "Missing Supabase admin environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
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
