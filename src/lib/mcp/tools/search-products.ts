import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description: "Search tracked grocery products by name or category and see the latest reported price for each.",
  inputSchema: {
    query: z.string().describe("Text to match against the product name. Use an empty string to list everything."),
    category: z.string().optional().describe("Optional category filter: Grocery, Dairy, Produce or Household."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("products").select("id, name, category").order("name").limit(50);
    if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
    if (category) q = q.eq("category", category);
    const { data: products, error } = await q;
    if (error) return errorResult(error.message);
    if (!products?.length) return textResult("No matching products found.", { products: [] });

    const { data: reports } = await supabase
      .from("price_reports")
      .select("product_id, price, store_name, city, created_at")
      .in("product_id", products.map((p) => p.id))
      .order("created_at", { ascending: false });

    const rows = products.map((p) => {
      const latest = reports?.find((r) => r.product_id === p.id);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        latest_price_pkr: latest?.price ?? null,
        store: latest?.store_name ?? null,
        city: latest?.city ?? null,
        reported_at: latest?.created_at ?? null,
      };
    });

    return textResult(
      rows
        .map((r) => `${r.name} (${r.category}): ${r.latest_price_pkr ? `PKR ${r.latest_price_pkr} at ${r.store}, ${r.city}` : "no price reported yet"}`)
        .join("\n"),
      { products: rows },
    );
  },
});
