import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import listPriceReports from "./tools/list-price-reports";
import reportPrice from "./tools/report-price";
import getShoppingList from "./tools/get-shopping-list";
import addToShoppingList from "./tools/add-to-shopping-list";

// Direct Supabase host is required as the OAuth issuer (the publish-time proxy URL fails RFC 8414 issuer matching).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ai-price-tracker-mcp",
  title: "AI Price Tracker",
  version: "0.1.0",
  instructions:
    "Tools for AI Price Tracker, a crowdsourced grocery price tracker for Pakistan. Use search_products to find items and their latest PKR prices, list_price_reports for the full price history of a product, report_price to submit a price seen in a store, and get_shopping_list / add_to_shopping_list to work with the signed-in user's list and monthly budget.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, listPriceReports, reportPrice, getShoppingList, addToShoppingList],
});
