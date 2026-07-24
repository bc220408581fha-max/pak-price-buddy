import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, ChevronRight } from "lucide-react";
import { formatPKR } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["All", "Grocery", "Dairy", "Produce", "Household"];

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — AI Price Tracker" },
      { name: "description", content: "Browse and search crowdsourced product prices across Pakistan." },
      { property: "og:title", content: "Products — AI Price Tracker" },
      { property: "og:description", content: "Browse and search crowdsourced product prices across Pakistan." },
    ],
  }),
  component: Products,
});

function Products() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const productsQ = useQuery({
    queryKey: ["products", q, cat],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,category").order("name");
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      if (cat !== "All") query = query.eq("category", cat);
      const { data } = await query.limit(200);
      return data ?? [];
    },
  });

  const latestQ = useQuery({
    queryKey: ["latest-prices", productsQ.data?.map((p) => p.id).join(",")],
    enabled: !!productsQ.data && productsQ.data.length > 0,
    queryFn: async () => {
      const ids = (productsQ.data ?? []).map((p) => p.id);
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("price_reports")
        .select("product_id,price,created_at")
        .in("product_id", ids)
        .order("created_at", { ascending: false });
      const map: Record<string, number> = {};
      for (const r of data ?? []) {
        if (map[r.product_id as string] === undefined) map[r.product_id as string] = Number(r.price);
      }
      return map;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search milk, atta, oil..." className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button asChild variant="default">
          <Link to="/products/new"><Plus className="h-4 w-4 mr-1" /> Report new item</Link>
        </Button>
      </div>

      {(productsQ.data ?? []).length === 0 && !productsQ.isLoading && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No products yet. Click <span className="font-medium">"Report new item"</span> to add the first one with its price.
        </CardContent></Card>
      )}

      <div className="grid gap-2">
        {(productsQ.data ?? []).map((p) => {
          const price = latestQ.data?.[p.id];
          return (
            <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="block">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <Badge variant="secondary" className="mt-1">{p.category}</Badge>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        {price !== undefined ? formatPKR(price) : "No price yet"}
                      </div>
                      <div className="text-xs text-muted-foreground">latest report</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
