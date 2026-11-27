import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in as Platform Super Admin." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: "Your session is invalid. Sign in again." }, 401);
  const { data: superAdmin, error: adminCheckError } = await caller
    .from("platform_super_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminCheckError || !superAdmin) return json({ error: "Platform Super Admin access required." }, 403);

  let input: { name?: string; slug?: string; email?: string; plan?: string };
  try { input = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const name = String(input.name ?? "").trim();
  const slug = String(input.slug ?? "").trim().toLowerCase();
  const email = String(input.email ?? "").trim().toLowerCase();
  const plan = String(input.plan ?? "starter").trim().toLowerCase();
  if (name.length < 2 || name.length > 120) return json({ error: "Business name must be 2–120 characters." }, 400);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 50)
    return json({ error: "Use a 3–50 character slug with lowercase letters, numbers and single hyphens." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return json({ error: "Enter a valid owner email address." }, 400);

  const { data: tenants, error: listError } = await caller.rpc("platform_list_tenants");
  if (listError) return json({ error: listError.message }, 400);
  if ((tenants ?? []).some((tenant: { slug: string }) => tenant.slug.toLowerCase() === slug))
    return json({ error: "That business slug is already in use." }, 409);

  const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: invitation, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { account_type: "business_owner", invited_by_platform_admin: user.id, business_name: name },
  });
  if (inviteError || !invitation.user) {
    const message = inviteError?.message ?? "The owner invitation could not be created.";
    const existing = /already|registered|exists/i.test(message);
    return json({
      error: existing ? "This email already has an account. Use “Create for existing owner” instead." : message,
      code: existing ? "OWNER_EXISTS" : "INVITE_FAILED",
    }, existing ? 409 : 400);
  }

  const { data: created, error: provisionError } = await caller.rpc("platform_create_tenant", {
    p_name: name, p_slug: slug, p_owner_email: email, p_plan_code: plan,
  });
  if (provisionError) {
    const { error: cleanupError } = await service.auth.admin.deleteUser(invitation.user.id);
    return json({
      error: provisionError.message,
      invitation_cleanup: cleanupError ? "The invited account could not be automatically rolled back; review Auth users." : "rolled_back",
    }, 400);
  }
  return json({
    success: true, tenant: created,
    message: "Invitation sent and business workspace created. The owner can finish account setup from the email.",
  });
});
