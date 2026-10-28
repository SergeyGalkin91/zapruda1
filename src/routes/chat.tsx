import { createFileRoute } from "@tanstack/react-router";
import { Shell, NotConnected } from "@/components/Shell";

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

const quick = ["🎣", "🐟", "🔥", "👍", "😂", "💪"];

function Chat() {
  return (
    <Shell>
      <div className="panel flex h-[calc(100vh-11rem)] flex-col md:h-[calc(100vh-8rem)]">
        <div className="border-b px-5 py-3">
          <h1 className="text-lg font-bold">Чат рыболовов</h1>
          <p className="text-xs text-muted-foreground">Общий канал · в реальном времени</p>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
          <NotConnected what="Сообщения, ответы, реакции и вложения" />
        </div>
        <form className="space-y-2 border-t p-3" onSubmit={(e) => e.preventDefault()}>
          <div className="flex gap-1">
            {quick.map((q) => (
              <button key={q} type="button" className="rounded-md px-2 py-1 text-lg hover:bg-secondary">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="btn-ghost cursor-pointer" aria-label="Прикрепить фото или видео">
              📎<input type="file" accept="image/*,video/*" className="hidden" disabled />
            </label>
            <input className="field" placeholder="Сообщение…" disabled />
            <button className="btn-primary" disabled>Отправить</button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
