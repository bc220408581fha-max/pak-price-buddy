import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPKR, daysAgo } from "@/lib/format";
import { CheckCircle2, ArrowLeft, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/products/$id")({
  head: () => ({
    meta: [
      { title: "Product prices — AI Price Tracker" },
      { name: "description", content: "See all reported prices for this product across stores and cities in Pakistan." },
      { property: "og:title", content: "Product prices — AI Price Tracker" },
      { property: "og:description", content: "See all reported prices for this product across stores and cities in Pakistan." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [store, setStore] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const productQ = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const reportsQ = useQuery({
    queryKey: ["reports", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_reports")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("price_reports").insert({
        product_id: id,
        store_name: store.trim(),
        city: city.trim(),
        price: Number(price),
        reported_by: u.user.id,
      });
      if (error) throw error;
      toast.success("Price submitted");
      setStore(""); setCity(""); setPrice("");
      qc.invalidateQueries({ queryKey: ["reports", id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmStill(reportId: string) {
    try {
      await confirmPrice({ data: { reportId } });
      toast.success("Thanks for confirming!");
      qc.invalidateQueries({ queryKey: ["reports", id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not confirm this price right now.");
    }
  }


  async function addToList(productId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: lists } = await supabase
      .from("shopping_lists").select("id").eq("user_id", u.user.id)
      .order("created_at", { ascending: false }).limit(1);
    let listId = lists?.[0]?.id as string | undefined;
    if (!listId) {
      const { data: created, error } = await supabase
        .from("shopping_lists").insert({ user_id: u.user.id, name: "My List" }).select("id").single();
      if (error) return toast.error(error.message);
      listId = created.id as string;
    }
    const { error } = await supabase.from("shopping_list_items").insert({ list_id: listId, product_id: productId, quantity: 1 });
    if (error) return toast.error(error.message);
    toast.success("Added to your shopping list");
  }

  return (
    <div className="space-y-4">
      <Link to="/products" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{productQ.data?.name ?? "…"}</h1>
          {productQ.data && <Badge variant="secondary" className="mt-1">{productQ.data.category}</Badge>}
        </div>
        {productQ.data && (
          <Button variant="outline" onClick={() => addToList(productQ.data!.id as string)}>
            <Plus className="h-4 w-4 mr-1" /> Add to my list
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Report a price</CardTitle><CardDescription>Help others find the best deal.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <div><Label htmlFor="s">Store</Label><Input id="s" value={store} onChange={(e) => setStore(e.target.value)} required /></div>
            <div><Label htmlFor="c">City</Label><Input id="c" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
            <div><Label htmlFor="p">Price (PKR)</Label><Input id="p" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
            <div className="flex items-end"><Button type="submit" className="w-full" disabled={busy}>Submit</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Reported prices</h2>
        {(reportsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No prices reported yet.</p>}
        {(reportsQ.data ?? []).map((r: any) => {
          const d = daysAgo(r.created_at);
          const stale = d > 30;
          return (
            <Card key={r.id}>
              <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-medium">{r.store_name} · {r.city}</div>
                  <div className="text-xs text-muted-foreground">
                    {d}d ago {stale && <Badge variant="outline" className="ml-1 text-warning border-warning">Older than 30d</Badge>}
                    {r.still_accurate_count > 0 && <span className="ml-2">· {r.still_accurate_count} confirmed accurate</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-primary text-lg">{formatPKR(r.price)}</div>
                  <Button size="sm" variant="outline" onClick={() => confirmStill(r.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Still accurate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
