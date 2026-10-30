import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Чат рыболовов — ZAPRUDA" },
      { name: "description", content: "Общий чат спиннингистов." },
      { property: "og:title", content: "Чат рыболовов — ZAPRUDA" },
      { property: "og:description", content: "Общий чат спиннингистов." },
    ],
  }),
  component: Chat,
});

const quick = ["🎣", "🐟", "🔥", "👍", "😂", "💪", "❤️", "👏", "🤝", "🤯", "🐊", "🏆", "🌧️", "🌅", "📍", "🪱"];
type ChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null; chat_city: string | null } | null;
};

function Chat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Загружаем чат…");
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setUserId(null);
      setStatus("Войди в аккаунт, чтобы читать и отправлять сообщения.");
      return;
    }
    setUserId(authData.user.id);
    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url,chat_city)")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      setStatus("Не удалось загрузить чат: " + error.message);
      return;
    }
    setMessages((data ?? []) as ChatMessage[]);
    setStatus("");
  }, []);

  useEffect(() => {
    void loadMessages();
    const channel = supabase
      .channel("zaprud-chat-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        void loadMessages();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadMessages]);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId || sending) return;
    setSending(true);
    const { error } = await (supabase as any).from("chat_messages").insert({ user_id: userId, body });
    setSending(false);
    if (error) {
      setStatus("Сообщение не отправлено: " + error.message);
      return;
    }
    setDraft("");
    await loadMessages();
  }

  return (
    <Shell>
      <div className="panel flex h-[calc(100vh-11rem)] flex-col md:h-[calc(100vh-8rem)]">
        <div className="border-b px-5 py-3">
          <h1 className="text-lg font-bold">Чат рыболовов 🎣</h1>
          <p className="text-xs text-muted-foreground">Общий канал · рыбалка, трофеи и немного баек 😂</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {status && <div className="rounded-lg border p-3 text-xs text-muted-foreground">{status}</div>}
          {messages.map((message) => (
            <div key={message.id} className="max-w-[90%] space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-sm">🎣</span>
                <span className="font-semibold text-zinc-200">
                  {message.profiles?.display_name || message.profiles?.username || (message.user_id === userId ? "Вы" : "Рыболов")}
                  {message.profiles?.chat_city ? <span className="ml-1 font-normal text-[#D7FF35]">({message.profiles.chat_city})</span> : null}
                  {message.user_id === userId && <span className="ml-1 font-normal text-zinc-500">· Вы</span>}
                </span>
                <time>{new Date(message.created_at).toLocaleString()}</time>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm whitespace-pre-wrap break-words">{message.body}</div>
            </div>
          ))}
          {!status && messages.length === 0 && <p className="text-sm text-muted-foreground">Пока тихо. Будь первым — напиши в чат! 🎣</p>}
        </div>
        <form className="space-y-2 border-t p-3" onSubmit={send}>
          <div className="flex flex-wrap gap-1">
            {quick.map((q) => (
              <button key={q} type="button" title={`Добавить ${q}`} onClick={() => setDraft((d) => d + q)}
                className="rounded-md px-2 py-1 text-lg transition hover:-translate-y-0.5 hover:bg-secondary">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="field min-w-0 flex-1" placeholder={userId ? "Напиши что-нибудь… 🎣" : "Сначала войди в аккаунт"} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!userId || sending} maxLength={2000} />
            <button className="btn-primary" type="submit" disabled={!draft.trim() || !userId || sending}>{sending ? "Отправляем…" : "Отправить 🚀"}</button>
          </div>
        </form>
      </div>
      <Link to="/messages" search={{ mark: "" }} className="panel mt-4 flex items-center justify-between p-4 transition hover:border-[#D7FF35]/40"><span><strong className="block">Личные сообщения</strong><span className="text-sm text-zinc-400">Запросы на переписку, подписки и обмен приватными точками</span></span><span className="text-[#D7FF35]">Открыть →</span></Link>
    </Shell>
  );
}
