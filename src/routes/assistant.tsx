import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "ИИ-рыболов — ZAPRUDA" },
      { name: "description", content: "Персональный план выезда с учётом погоды, водоёма и ваших снастей." },
      { property: "og:title", content: "ИИ-рыболов — ZAPRUDA" },
      { property: "og:description", content: "Персональный план выезда с учётом погоды, водоёма и ваших снастей." },
    ],
  }),
  component: Assistant,
});

const steps = [
  ["Водоём или место", <input className="field" placeholder="Например, Иваньковское водохранилище" />],
  ["Город или координаты (необязательно)", <input className="field" placeholder="Тверь или 56.85, 35.90" />],
  ["Дата и время", <input className="field" type="datetime-local" />],
  ["Способ ловли", <select className="field"><option>Берег</option><option>Лодка</option><option>Другое</option></select>],
  ["Целевая рыба", <select className="field"><option>Любой хищник</option><option>Щука</option><option>Судак</option><option>Окунь</option><option>Жерех</option></select>],
  ["Комплект снастей", <select className="field" disabled><option>Комплекты появятся в профиле</option></select>],
  ["Приманки", <input className="field" placeholder="Виброхвост 3”, джиг-голова 14 г…" />],
] as const;

function Assistant() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">ИИ-рыболов</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        План выезда с учётом места, времени, рыбы и ваших снастей. Без выдуманного прогноза и обещаний клёва.
      </p>
      <form className="mt-6 space-y-3" onSubmit={(e) => e.preventDefault()}>
        {steps.map(([t, el], i) => (
          <div key={t} className="panel flex gap-4 p-4">
            <span className="font-display text-primary">{String(i + 1).padStart(2, "0")}</span>
            <label className="flex-1 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t}</span>
              {el}
            </label>
          </div>
        ))}
        <button className="btn-primary" disabled>Проанализировать выезд</button>
        <p className="text-xs text-muted-foreground">Заработает после подключения базы данных.</p>
      </form>
    </Shell>
  );
}
