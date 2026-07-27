import { createServerFn } from "@tanstack/react-start";

const DEMO_EMAIL = "demo@pricetracker.com";

/**
 * Ensures the shared demo account exists and returns a one-time token hash the
 * browser can exchange for a session. No password ever leaves the server.
 */
export const startDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name: "Demo Shopper" },
  });
  if (createError && !/already|registered|exists/i.test(createError.message)) {
    console.error("[demo] createUser failed:", createError.message);
    throw new Error("Could not start the demo session.");
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
  });
  if (error || !data?.properties?.hashed_token) {
    console.error("[demo] generateLink failed:", error?.message);
    throw new Error("Could not start the demo session.");
  }

  return { tokenHash: data.properties.hashed_token };
});
