import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Check } from "lucide-react";
import { formatPKR, categorizeProduct } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/list")({
  head: () => ({
    meta: [
      { title: "Shopping List — AI Price Tracker" },
      { name: "description", content: "Build your shopping list and see the estimated total based on the latest prices." },
      { property: "og:title", content: "Shopping List — AI Price Tracker" },
      { property: "og:description", content: "Build your shopping list and see the estimated total based on the latest prices." },
    ],
  }),
  component: ShoppingList,
});

function ShoppingList() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const listQ = useQuery({
    queryKey: ["active-list"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      let { data: lists } = await supabase
        .from("shopping_lists").select("*").eq("user_id", u.user.id)
        .order("created_at", { ascending: false }).limit(1);
      if (!lists || lists.length === 0) {
        const { data: created } = await supabase
          .from("shopping_lists").insert({ user_id: u.user.id, name: "My List" }).select("*").single();
        return created;
      }
      return lists[0];
    },
  });

  const itemsQ = useQuery({
    queryKey: ["list-items", listQ.data?.id],
    enabled: !!listQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("shopping_list_items")
        .select("id,quantity,product:products(id,name,category)")
        .eq("list_id", listQ.data!.id);
      // fetch latest price for each
      const enriched = [];
      for (const it of data ?? []) {
        const { data: rp } = await supabase
          .from("price_reports").select("price,store_name,city,created_at")
          .eq("product_id", (it as any).product.id)
          .order("created_at", { ascending: false }).limit(1);
        enriched.push({ ...(it as any), latest: rp?.[0] });
      }
      return enriched;
    },
  });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!listQ.data) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data: existing } = await supabase.from("products").select("id").ilike("name", trimmed).limit(1);
    let productId = existing?.[0]?.id as string | undefined;
    if (!productId) {
      const { data: created, error } = await supabase
        .from("products").insert({ name: trimmed, category: categorizeProduct(trimmed) }).select("id").single();
      if (error) return toast.error(error.message);
      productId = created.id as string;
    }
    const { error } = await supabase.from("shopping_list_items").insert({
      list_id: listQ.data.id, product_id: productId, quantity: Number(qty || 1),
    });
    if (error) return toast.error(error.message);
    setName(""); setQty("1");
    qc.invalidateQueries({ queryKey: ["list-items", listQ.data.id] });
    qc.invalidateQueries({ queryKey: ["list-estimate"] });
  }

  async function remove(itemId: string) {
    const { error } = await supabase.from("shopping_list_items").delete().eq("id", itemId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["list-items", listQ.data?.id] });
    qc.invalidateQueries({ queryKey: ["list-estimate"] });
  }

  const items = itemsQ.data ?? [];
  const total = items.reduce((sum, it: any) => sum + Number(it.latest?.price ?? 0) * Number(it.quantity), 0);
  const budget = Number(profileQ.data?.monthly_budget ?? 0);
  const over = budget > 0 && total > budget;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{listQ.data?.name ?? "My List"}</CardTitle>
              <CardDescription>{items.length} item(s) · estimated total below</CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${over ? "text-destructive" : "text-primary"}`}>{formatPKR(total)}</div>
              {budget > 0 && (
                <Badge variant={over ? "destructive" : "default"} className={over ? "" : "bg-success text-success-foreground"}>
                  {over ? "Over budget" : "Within budget"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {budget > 0 ? (
            <Progress value={pct} className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Set a monthly budget in <Link to="/budget" className="text-primary underline">Budget</Link> to see comparison.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add item</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addItem} className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
            <div><Label>Product</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Atta 10kg" /></div>
            <div><Label>Qty</Label><Input value={qty} type="number" min="0.1" step="0.1" onChange={(e) => setQty(e.target.value)} /></div>
            <div className="flex items-end"><Button type="submit"><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Your list is empty. Add items above or from the Products page.</p>}
        {items.map((it: any) => (
          <Card key={it.id}>
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.product.name}</div>
                <div className="text-xs text-muted-foreground">
                  Qty {it.quantity} · {it.latest ? `${formatPKR(it.latest.price)} at ${it.latest.store_name}, ${it.latest.city}` : "No price yet"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-primary">
                  {it.latest ? formatPKR(Number(it.latest.price) * Number(it.quantity)) : "—"}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
