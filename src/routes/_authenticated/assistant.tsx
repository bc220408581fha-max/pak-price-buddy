import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, Trash2, User as UserIcon } from "lucide-react";
import { sendAssistantMessage, clearAssistantMessages } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Shopping Assistant — AI Price Tracker" },
      { name: "description", content: "Chat with a budget-conscious AI shopping assistant tuned for Pakistan grocery prices." },
      { property: "og:title", content: "AI Shopping Assistant — AI Price Tracker" },
      { property: "og:description", content: "Chat with a budget-conscious AI shopping assistant tuned for Pakistan grocery prices." },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const qc = useQueryClient();
  const send = useServerFn(sendAssistantMessage);
  const clear = useServerFn(clearAssistantMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const msgsQ = useQuery({
    queryKey: ["ai-messages"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("ai_messages")
        .select("id,role,content,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgsQ.data, busy]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    try {
      await send({ data: { message: text } });
      await qc.invalidateQueries({ queryKey: ["ai-messages"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function reset() {
    if (!confirm("Clear the entire conversation?")) return;
    await clear({ data: undefined as any });
    qc.invalidateQueries({ queryKey: ["ai-messages"] });
  }

  const messages = msgsQ.data ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">AI Shopping Assistant</div>
            <div className="text-xs text-muted-foreground">Knows your list, budget & latest prices</div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={reset}><Trash2 className="h-4 w-4 mr-1" /> Clear</Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-6 text-sm space-y-2">
              <p className="font-medium">Try asking:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>"Am I over budget this month?"</li>
                <li>"Which items are cheapest right now?"</li>
                <li>"Suggest ways to cut Rs 2,000 from my list."</li>
              </ul>
            </CardContent>
          </Card>
        )}
        {messages.map((m: any) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role !== "user" && (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground animate-pulse">Thinking…</div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2 border-t pt-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your list, prices, or budget…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
