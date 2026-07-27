import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { categorize } from "@/lib/format";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "report_price",
  title: "Report a price",
  description: "Submit a price you saw in a store for a product. Creates the product (auto-categorized) if it does not exist yet.",
  inputSchema: {
    product_name: z.string().describe("Product name, e.g. 'Basmati Rice 1kg'."),
    store_name: z.string().describe("Store where the price was seen, e.g. 'Al-Fatah'."),
    city: z.string().describe("City, e.g. 'Lahore'."),
    price: z.number().describe("Price in PKR."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ product_name, store_name, city, price }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const name = product_name.trim();

    const { data: existing } = await supabase.from("products").select("id, name").ilike("name", name).limit(1).maybeSingle();
    let productId = existing?.id;
    if (!productId) {
      const { data: created, error: createError } = await supabase
        .from("products")
        .insert({ name, category: categorize(name) })
        .select("id")
        .single();
      if (createError) return errorResult(createError.message);
      productId = created.id;
    }

    const { error } = await supabase
      .from("price_reports")
      .insert({ product_id: productId, store_name: store_name.trim(), city: city.trim(), price, reported_by: ctx.getUserId()! });
    if (error) return errorResult(error.message);

    return textResult(`Reported ${name} at PKR ${price} — ${store_name}, ${city}.`, { product_id: productId });
  },
});
