import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_price_reports",
  title: "List price reports",
  description: "List crowdsourced price reports for one product, newest first, including store, city, price in PKR and date.",
  inputSchema: {
    product_id: z.string().describe("The product id returned by search_products."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("price_reports")
      .select("id, store_name, city, price, created_at, still_accurate_count")
      .eq("product_id", product_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return errorResult(error.message);
    if (!data?.length) return textResult("No price reports for this product yet.", { reports: [] });
    return textResult(
      data
        .map((r) => `PKR ${r.price} — ${r.store_name}, ${r.city} (${new Date(r.created_at).toLocaleDateString()}, ${r.still_accurate_count} confirmations)`)
        .join("\n"),
      { reports: data },
    );
  },
});
