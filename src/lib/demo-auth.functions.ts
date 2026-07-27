import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@pricetracker.com";

/**
 * Ensures the shared demo account exists and returns a session for it.
 * The demo password lives only on the server (DEMO_ACCOUNT_PASSWORD secret).
 */
export const startDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) throw new Error("Demo account is not configured.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Create the demo user if it doesn't exist yet (idempotent).
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { name: "Demo Shopper" },
  });
  if (createError && !/already|registered|exists/i.test(createError.message)) {
    throw new Error("Could not start the demo session.");
  }

  const authClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (publishableKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${publishableKey}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", publishableKey);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await authClient.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password,
  });
  if (error || !data.session) throw new Error("Could not start the demo session.");

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
});
