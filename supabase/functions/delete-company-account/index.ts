import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "https://digitalfoxstudios.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function tokenIssuedRecently(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    const issuedAt = Number(claims.iat || 0);
    const age = Math.floor(Date.now() / 1000) - issuedAt;
    return age >= 0 && age <= 300;
  } catch {
    return false;
  }
}

async function removeOrgFolder(admin: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const storage = admin.storage.from(bucket);
  const removeFolder = async (folder: string): Promise<void> => {
    while (true) {
      const { data, error } = await storage.list(folder, { limit: 500, offset: 0 });
      if (error) throw new Error("Could not inspect stored company files in " + bucket + ".");
      if (!data?.length) break;
      const files: string[] = [];
      for (const item of data) {
        const path = folder + "/" + item.name;
        if (item.id === null) await removeFolder(path);
        else files.push(path);
      }
      if (files.length) {
        const { error: removeError } = await storage.remove(files);
        if (removeError) throw new Error("Could not remove stored company files in " + bucket + ".");
      }
    }
  };
  await removeFolder(prefix);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || !tokenIssuedRecently(token)) {
    return json({ error: "Please re-enter your password to refresh your secure session, then try again." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Account deletion is not configured." }, 500);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await caller.auth.getUser(token);
  if (authError || !user) return json({ error: "Your secure session could not be verified." }, 401);

  let input: { company_name?: string; confirmation?: string };
  try { input = await req.json(); } catch { return json({ error: "Invalid confirmation request." }, 400); }
  if (input.confirmation !== "DELETE MY COMPANY") return json({ error: "The typed confirmation did not match." }, 400);

  const admin = createClient(url, serviceKey);
  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("role", "owner")
    .maybeSingle();
  if (membershipError || !membership) return json({ error: "Only the active company owner can delete this company account." }, 403);

  const { data: company, error: companyError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", membership.organization_id)
    .maybeSingle();
  if (companyError || !company) return json({ error: "The company workspace could not be verified." }, 404);
  if (String(input.company_name || "").trim() !== company.name) {
    return json({ error: "The company name confirmation does not match." }, 400);
  }

  const { count: ownerCount, error: ownerCountError } = await admin
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", company.id)
    .eq("role", "owner")
    .eq("status", "active");
  if (ownerCountError) return json({ error: "Could not verify company ownership." }, 500);
  if ((ownerCount || 0) !== 1) {
    return json({ error: "This company has multiple active owners. Resolve ownership before deleting the company account." }, 409);
  }

  // Company uploads are stored under the organization UUID in each of these buckets.
  try {
    const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
    if (bucketsError) return json({ error: "Could not verify company file storage. No data was deleted." }, 500);
    for (const bucket of ["office-documents", "task-reports", "task-expenses"]) {
      if ((buckets || []).some(item => item.name === bucket)) {
        await removeOrgFolder(admin, bucket, company.id);
      }
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Company file cleanup failed. No database records were deleted." }, 500);
  }

  const { error: orgDeleteError } = await admin.from("organizations").delete().eq("id", company.id);
  if (orgDeleteError) return json({ error: "Company records could not be deleted. Your login is still active: " + orgDeleteError.message }, 500);

  const { error: userDeleteError } = await admin.auth.admin.deleteUser(user.id);
  if (userDeleteError) {
    return json({ error: "Company data was deleted, but the login could not be removed. Contact support to complete account closure." }, 500);
  }

  return json({ success: true, message: "Company workspace, stored company files, memberships and owner login have been deleted." });
});
