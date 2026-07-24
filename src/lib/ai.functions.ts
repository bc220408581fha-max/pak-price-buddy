import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `You are a budget-conscious shopping assistant for users in Pakistan. You receive the user's shopping list, their monthly budget, and recent price data submitted by other users for each product (store name, city, price, date). Recommend the cheapest reliable option per item, note if a price looks outdated (more than 30 days old), estimate the total cost of the list, and tell the user clearly if they are over budget with specific suggestions to cut cost. Respond in simple, friendly English, use PKR for currency, and be concise and practical like a helpful friend rather than a formal analyst.`;

const SendInput = z.object({ message: z.string().min(1).max(2000) });

type ContextPayload = {
  budget: number;
  list: Array<{
    product: string;
    quantity: number;
    recentReports: Array<{ store: string; city: string; price: number; daysAgo: number }>;
  }>;
};

async function loadContext(supabase: any, userId: string): Promise<ContextPayload> {
  const { data: profile } = await supabase.from("profiles").select("monthly_budget").eq("id", userId).maybeSingle();
  const budget = Number(profile?.monthly_budget ?? 0);

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const listId = lists?.[0]?.id as string | undefined;

  if (!listId) return { budget, list: [] };

  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("quantity, product:products(id,name)")
    .eq("list_id", listId);

  const contextList: ContextPayload["list"] = [];
  for (const it of items ?? []) {
    const product = (it as any).product;
    if (!product) continue;
    const { data: reports } = await supabase
      .from("price_reports")
      .select("store_name,city,price,created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(5);
    contextList.push({
      product: product.name,
      quantity: Number((it as any).quantity),
      recentReports: (reports ?? []).map((r: any) => ({
        store: r.store_name,
        city: r.city,
        price: Number(r.price),
        daysAgo: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000),
      })),
    });
  }
  return { budget, list: contextList };
}

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Save user message
    await supabase.from("ai_messages").insert({ user_id: userId, role: "user", content: data.message });

    // Load history
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);

    const ctx = await loadContext(supabase, userId);
    const contextMessage = `Context for this reply (JSON):\n${JSON.stringify(ctx, null, 2)}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextMessage },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("The assistant is busy right now. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI error: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const reply = json?.choices?.[0]?.message?.content ?? "Sorry, I couldn't produce a response.";

    await supabase.from("ai_messages").insert({ user_id: userId, role: "assistant", content: reply });
    return { reply };
  });

export const clearAssistantMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("ai_messages").delete().eq("user_id", context.userId);
    return { ok: true };
  });
