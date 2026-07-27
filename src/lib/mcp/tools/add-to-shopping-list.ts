import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "add_to_shopping_list",
  title: "Add item to shopping list",
  description: "Add a tracked product to the signed-in user's shopping list with a quantity. Creates a list if none exists.",
  inputSchema: {
    product_id: z.string().describe("Product id from search_products."),
    quantity: z.number().describe("How many units to add. Defaults to 1 if omitted upstream."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ product_id, quantity }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    let { data: list } = await supabase.from("shopping_lists").select("id").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
    if (!list) {
      const { data: created, error: listError } = await supabase
        .from("shopping_lists")
        .insert({ user_id: userId, name: "My List" })
        .select("id")
        .single();
      if (listError) return errorResult(listError.message);
      list = created;
    }

    const { error } = await supabase
      .from("shopping_list_items")
      .insert({ list_id: list.id, product_id, quantity: Math.max(1, Math.round(quantity)) });
    if (error) return errorResult(error.message);
    return textResult("Added to your shopping list.", { list_id: list.id });
  },
});
