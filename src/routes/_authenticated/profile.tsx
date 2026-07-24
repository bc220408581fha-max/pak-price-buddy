import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AI Price Tracker" },
      { name: "description", content: "Update your name, monthly budget, and sign out." },
      { property: "og:title", content: "Profile — AI Price Tracker" },
      { property: "og:description", content: "Update your name, monthly budget, and sign out." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { ...data, email: u.user.email };
    },
  });

  useEffect(() => {
    if (profileQ.data) {
      setName(profileQ.data.name ?? "");
      setBudget(String(profileQ.data.monthly_budget ?? ""));
    }
  }, [profileQ.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id, name: name.trim(), monthly_budget: Number(budget || 0),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>{profileQ.data?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label htmlFor="n">Name</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="b">Monthly Budget (PKR)</Label>
              <Input id="b" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of AI Price Tracker on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
