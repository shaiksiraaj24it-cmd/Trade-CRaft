// Supabase Edge Function: invite-user
//
// Implements the server-side user invite used by the admin UI. Inviting a user
// by email requires the Supabase *service role* key, which must never reach
// the browser — so this runs server-side as an Edge Function instead.
//
// Deploy:
//   supabase functions deploy invite-user
//
// The function checks that the caller is an authenticated admin (via their
// own JWT), then uses the service-role client to send the invite email and
// pre-create a profile row with the chosen role.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerToken = authHeader.replace("Bearer ", "");

  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401 });
  }

  // Client scoped to the caller's own JWT, just to verify who's asking.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(callerToken);
  if (callerErr || !caller) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: callerProfile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
  }

  // Full-power client, only used server-side.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role: role === "admin" ? "admin" : "user" },
  });

  if (inviteErr) {
    return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400 });
  }

  // handle_new_user() trigger already created the profile row with the
  // right role from user_metadata, but set it explicitly in case the invited
  // user already existed.
  if (invited?.user?.id) {
    await adminClient
      .from("profiles")
      .update({ role: role === "admin" ? "admin" : "user" })
      .eq("id", invited.user.id);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
