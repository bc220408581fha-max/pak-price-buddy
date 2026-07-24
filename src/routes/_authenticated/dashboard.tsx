import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, Wallet, ListChecks, ShoppingBasket } from "lucide-react";
import { formatPKR, daysAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Price Tracker" },
      { name: "description", content: "Your monthly budget, shopping list total, and the latest crowdsourced prices." },
      { property: "og:title", content: "Dashboard — AI Price Tracker" },
      { property: "og:description", content: "Track your grocery spending and see live prices from other shoppers." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const listEstimateQ = useQuery({
    queryKey: ["list-estimate"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { total: 0, itemCount: 0, listName: null };
      const { data: lists } = await supabase
        .from("shopping_lists")
        .select("id,name")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const list = lists?.[0];
      if (!list) return { total: 0, itemCount: 0, listName: null };
      const { data: items } = await supabase
        .from("shopping_list_items")
        .select("quantity, product_id, product:products(id,name)")
        .eq("list_id", list.id);
      let total = 0;
      for (const it of items ?? []) {
        const { data: rp } = await supabase
          .from("price_reports")
          .select("price")
          .eq("product_id", (it as any).product_id)
          .order("created_at", { ascending: false })
          .limit(1);
        const price = Number(rp?.[0]?.price ?? 0);
        total += price * Number((it as any).quantity);
      }
      return { total, itemCount: items?.length ?? 0, listName: list.name };
    },
  });

  const recentQ = useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_reports")
        .select("id,store_name,city,price,created_at,product:products(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const budget = Number(profileQ.data?.monthly_budget ?? 0);
  const spent = listEstimateQ.data?.total ?? 0;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Assalam-o-Alaikum{profileQ.data?.name ? `, ${profileQ.data.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">Here's a quick look at your budget and grocery prices.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Monthly Budget</CardTitle>
                <CardDescription>
                  {budget > 0 ? (
                    <>Spent estimate: <span className="font-medium">{formatPKR(spent)}</span> of {formatPKR(budget)}</>
                  ) : (
                    <>Set your monthly budget in <Link to="/budget" className="text-primary underline">Budget</Link>.</>
                  )}
                </CardDescription>
              </div>
              {over ? (
                <Badge variant="destructive">Over budget</Badge>
              ) : budget > 0 ? (
                <Badge className="bg-success text-success-foreground">On track</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={pct} className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} />
            <p className="text-xs text-muted-foreground mt-2">Based on the most recent reported price for each item in your list.</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Shopping Assistant</CardTitle>
            <CardDescription className="text-primary-foreground/80">Ask about your list, prices, or how to stay under budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/assistant">Open assistant <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Your Shopping List</CardTitle>
            <CardDescription>
              {listEstimateQ.data?.listName
                ? `${listEstimateQ.data.listName} · ${listEstimateQ.data.itemCount} item(s)`
                : "No list yet — create one to estimate your grocery cost."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPKR(spent)}</div>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/list">Open list <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBasket className="h-5 w-5 text-primary" /> Recent Price Reports</CardTitle>
            <CardDescription>Latest 5 from the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentQ.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No reports yet. Be the first to <Link to="/products" className="text-primary underline">report a price</Link>.</p>
            )}
            {(recentQ.data ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium">{r.product?.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{r.store_name} · {r.city} · {daysAgo(r.created_at)}d ago</div>
                </div>
                <div className="font-semibold text-primary">{formatPKR(r.price)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
