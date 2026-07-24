import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPKR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "Budget Planner — AI Price Tracker" },
      { name: "description", content: "Set your monthly grocery budget and compare it with your active shopping list." },
      { property: "og:title", content: "Budget Planner — AI Price Tracker" },
      { property: "og:description", content: "Set your monthly grocery budget and compare it with your active shopping list." },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profileQ.data?.monthly_budget !== undefined) setValue(String(profileQ.data.monthly_budget ?? ""));
  }, [profileQ.data?.monthly_budget]);

  const estimateQ = useQuery({
    queryKey: ["list-estimate"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return 0;
      const { data: lists } = await supabase.from("shopping_lists").select("id").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1);
      const listId = lists?.[0]?.id;
      if (!listId) return 0;
      const { data: items } = await supabase.from("shopping_list_items").select("quantity,product_id").eq("list_id", listId);
      let total = 0;
      for (const it of items ?? []) {
        const { data: rp } = await supabase.from("price_reports").select("price").eq("product_id", (it as any).product_id).order("created_at", { ascending: false }).limit(1);
        total += Number(rp?.[0]?.price ?? 0) * Number((it as any).quantity);
      }
      return total;
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, monthly_budget: Number(value || 0) });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Budget updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  const total = typeof estimateQ.data === "number" ? estimateQ.data : 0;
  const budget = Number(profileQ.data?.monthly_budget ?? 0);
  const over = budget > 0 && total > budget;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const remaining = budget - total;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget</CardTitle>
          <CardDescription>Set a monthly grocery budget in PKR.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="b">Budget (PKR)</Label>
              <Input id="b" type="number" min="0" step="1" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs. Shopping List</CardTitle>
          <CardDescription>Estimated using the most recent reported price for each item.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Budget</div>
              <div className="text-lg font-semibold">{formatPKR(budget)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">List total</div>
              <div className={`text-lg font-semibold ${over ? "text-destructive" : "text-primary"}`}>{formatPKR(total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{remaining >= 0 ? "Remaining" : "Over by"}</div>
              <div className={`text-lg font-semibold ${over ? "text-destructive" : "text-success"}`}>{formatPKR(Math.abs(remaining))}</div>
            </div>
          </div>
          {budget > 0 ? (
            <>
              <Progress value={pct} className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} />
              <Badge variant={over ? "destructive" : "default"} className={over ? "" : "bg-success text-success-foreground"}>
                {over ? "Over budget" : "Within budget"}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Set a budget above to see the comparison.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Manage list items in <Link to="/list" className="text-primary underline">Shopping List</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
