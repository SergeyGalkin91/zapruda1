import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, NotConnected } from "@/components/Shell";
import { ReactionBar } from "@/components/ReactionBar";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Чат рыболовов — ZAPRUDA" },
      { name: "description", content: "Общий чат спиннингистов в реальном времени." },
      { property: "og:title", content: "Чат рыболовов — ZAPRUDA" },
      { property: "og:description", content: "Общий чат спиннингистов в реальном времени." },
    ],
  }),
  component: Chat,
});

const quick = ["🎣", "🐟", "🔥", "👍", "😂", "💪", "❤️", "👏", "🤝", "🤯", "🐊", "🏆", "🌧️", "🌅", "📍", "🪱"];

function Chat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([
    "Всем ни хвоста ни чешуи! 🎣🤝",
    "Сегодня щука брала на паузе 😂🐊",
  ]);

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setMessages((current) => [...current, message]);
    setDraft("");
  }

  return (
    <Shell>
      <div className="panel flex h-[calc(100vh-11rem)] flex-col md:h-[calc(100vh-8rem)]">
        <div className="border-b px-5 py-3">
          <h1 className="text-lg font-bold">Чат рыболовов 🎣</h1>
          <p className="text-xs text-muted-foreground">Общий канал · рыбалка, трофеи и немного баек 😂</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            ✨ Деморежим: сообщения и реакции пока хранятся только в этой открытой странице. После подключения таблиц Supabase подключим сохранение и чат в реальном времени.
          </div>
          {messages.map((message, i) => (
            <div key={i} className="max-w-[90%] space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-sm">🎣</span>
                <span>{i < 2 ? "Рыболов сообщества" : "Вы"}</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">{message}</div>
              <ReactionBar compact />
            </div>
          ))}
        </div>
        <form className="space-y-2 border-t p-3" onSubmit={send}>
          <div className="flex flex-wrap gap-1">
            {quick.map((q) => (
              <button key={q} type="button" title={`Добавить ${q}`} onClick={() => setDraft((d) => d + q)}
                className="rounded-md px-2 py-1 text-lg transition hover:-translate-y-0.5 hover:bg-secondary">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="btn-ghost cursor-pointer" aria-label="Прикрепить фото или видео">
              📎<input type="file" accept="image/*,video/*" className="hidden" disabled />
            </label>
            <input className="field" placeholder="Напиши что-нибудь… 🎣" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={!draft.trim()}>Отправить 🚀</button>
          </div>
        </form>
      </div>
      <div className="mt-4"><NotConnected what="Постоянное хранение чата, личные сообщения, вложения и синхронизация реакций между пользователями" /></div>
    </Shell>
  );
}
