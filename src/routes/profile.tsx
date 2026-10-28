import { createFileRoute } from "@tanstack/react-router";
import { Shell, NotConnected } from "@/components/Shell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Профиль рыболова — ZAPRUDA" },
      { name: "description", content: "Отчёты, трофеи и подписки рыболова." },
      { property: "og:title", content: "Профиль рыболова — ZAPRUDA" },
      { property: "og:description", content: "Отчёты, трофеи и подписки рыболова." },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <Shell>
      <div className="panel mb-6 flex items-center gap-4 p-6">
        <div className="size-16 rounded-full bg-secondary" />
        <div>
          <h1 className="text-xl font-bold">Профиль</h1>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>Отчёты —</span><span>Подписчики —</span><span>Подписки —</span>
          </div>
        </div>
      </div>
      <NotConnected what="Данные профиля и ваши отчёты" />
    </Shell>
  );
}
