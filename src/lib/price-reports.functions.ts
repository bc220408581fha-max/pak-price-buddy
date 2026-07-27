import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ConfirmInput = z.object({ reportId: z.string().uuid() });

export const confirmPriceStillAccurate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConfirmInput.parse(d))
  .handler(async ({ data, context }) => {
    // Ensure the report exists and is visible to this authenticated user.
    const { data: report, error: readError } = await context.supabase
      .from("price_reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (readError) throw new Error("Could not confirm this price right now.");
    if (!report) throw new Error("Price report not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: count, error } = await supabaseAdmin.rpc("confirm_price_still_accurate", {
      _report_id: data.reportId,
    });
    if (error) throw new Error("Could not confirm this price right now.");
    return { stillAccurateCount: count as number | null };
  });
