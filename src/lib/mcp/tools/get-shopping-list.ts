import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_shopping_list",
  title: "Get shopping list and budget",
  description: "Get the signed-in user's shopping list items with quantities, the estimated total in PKR, and their monthly budget.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    const { data: profile } = await supabase.from("profiles").select("monthly_budget").eq("id", userId).maybeSingle();
    const { data: list } = await supabase.from("shopping_lists").select("id, name").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
    if (!list) return textResult("No shopping list yet.", { items: [], estimated_total_pkr: 0, monthly_budget_pkr: profile?.monthly_budget ?? 0 });

    const { data: items, error } = await supabase
      .from("shopping_list_items")
      .select("quantity, product:products(id, name)")
      .eq("list_id", list.id);
    if (error) return errorResult(error.message);

    let total = 0;
    const rows: Array<{ name: string; quantity: number; unit_price_pkr: number | null }> = [];
    for (const item of items ?? []) {
      const product = item.product as { id: string; name: string } | null;
      if (!product) continue;
      const { data: latest } = await supabase
        .from("price_reports")
        .select("price")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const price = latest?.price ?? null;
      if (price) total += price * item.quantity;
      rows.push({ name: product.name, quantity: item.quantity, unit_price_pkr: price });
    }

    const budget = profile?.monthly_budget ?? 0;
    return textResult(
      `List "${list.name}": ${rows.map((r) => `${r.name} x${r.quantity}${r.unit_price_pkr ? ` @ PKR ${r.unit_price_pkr}` : " (no price)"}`).join(", ") || "empty"}\nEstimated total: PKR ${total} of a PKR ${budget} monthly budget.`,
      { list_name: list.name, items: rows, estimated_total_pkr: total, monthly_budget_pkr: budget },
    );
  },
});
