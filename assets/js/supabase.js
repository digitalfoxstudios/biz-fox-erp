import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
const SUPABASE_URL = "https://ulhnkrtbswolpywesbgx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TbdpsU_kyvXHuc9bo2R-bQ_QjFoFaW7";
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});
