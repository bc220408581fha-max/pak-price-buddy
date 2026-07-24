import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { categorizeProduct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products/new")({
  head: () => ({
    meta: [
      { title: "Report a new product — AI Price Tracker" },
      { name: "description", content: "Add a new product with its current price to help other shoppers." },
      { property: "og:title", content: "Report a new product — AI Price Tracker" },
      { property: "og:description", content: "Add a new product with its current price to help other shoppers." },
    ],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // Find or create product
      const trimmed = name.trim();
      let productId: string | null = null;
      const { data: existing } = await supabase.from("products").select("id").ilike("name", trimmed).limit(1);
      if (existing?.[0]) productId = existing[0].id as string;
      if (!productId) {
        const { data: created, error } = await supabase
          .from("products")
          .insert({ name: trimmed, category: categorizeProduct(trimmed) })
          .select("id")
          .single();
        if (error) throw error;
        productId = created.id as string;
      }

      const { error: pErr } = await supabase.from("price_reports").insert({
        product_id: productId,
        store_name: store.trim(),
        city: city.trim(),
        price: Number(price),
        reported_by: u.user.id,
      });
      if (pErr) throw pErr;

      toast.success("Price reported. Thank you!");
      navigate({ to: "/products/$id", params: { id: productId } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Report a new product</CardTitle>
          <CardDescription>We'll auto-categorize it based on the name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="n">Product name</Label>
              <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Olpers Milk 1L" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s">Store</Label>
                <Input id="s" required value={store} onChange={(e) => setStore(e.target.value)} placeholder="Imtiaz / local kiryana" />
              </div>
              <div>
                <Label htmlFor="c">City</Label>
                <Input id="c" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
              </div>
            </div>
            <div>
              <Label htmlFor="p">Price (PKR)</Label>
              <Input id="p" required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit price report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
