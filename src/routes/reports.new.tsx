import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/reports/new")({
  head: () => ({
    meta: [
      { title: "Новый отчёт — ZAPRUDA" },
      { name: "description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
      { property: "og:title", content: "Новый отчёт — ZAPRUDA" },
      { property: "og:description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
    ],
  }),
  component: NewReport,
});

type Catch = { species: string; weight: string; length: string };

function Label({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t}</span>
      {children}
    </label>
  );
}

function NewReport() {
  const [catches, setCatches] = useState<Catch[]>([{ species: "", weight: "", length: "" }]);
  const [story, setStory] = useState("");
  const upd = (i: number, k: keyof Catch, v: string) =>
    setCatches((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold">Новый отчёт</h1>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="panel grid gap-4 p-5 md:grid-cols-2">
          <Label t="Водоём"><input className="field" placeholder="Например, Волга у Твери" /></Label>
          <Label t="Дата"><input className="field" type="date" /></Label>
          <Label t="Погода"><input className="field" placeholder="Пасмурно, +12°" /></Label>
          <Label t="Давление, мм рт. ст."><input className="field" type="number" placeholder="752" /></Label>
          <Label t="Ветер"><input className="field" placeholder="СЗ, 4 м/с" /></Label>
          <Label t="Техника ловли"><input className="field" placeholder="Джиг, ступенька" /></Label>
          <div className="md:col-span-2">
            <Label t="Приманки"><input className="field" placeholder="Виброхвост 3”, колебалка 10 г" /></Label>
          </div>
          <div className="md:col-span-2">
            <Label t="Рассказ"><textarea className="field min-h-28" placeholder="Как прошла рыбалка?" /></Label>
          </div>
          <div className="md:col-span-2">
            <Label t="Фотографии"><input className="field" type="file" accept="image/*" multiple /></Label>
          </div>
        </section>

        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Улов</h2>
            <button type="button" className="btn-ghost"
              onClick={() => setCatches((c) => [...c, { species: "", weight: "", length: "" }])}>
              + Рыба
            </button>
          </div>
          {catches.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input className="field col-span-2 sm:col-span-1" placeholder="Вид (щука, окунь…)" value={c.species} onChange={(e) => upd(i, "species", e.target.value)} />
              <input className="field" type="number" placeholder="Вес, кг" value={c.weight} onChange={(e) => upd(i, "weight", e.target.value)} />
              <input className="field" type="number" placeholder="Длина, см" value={c.length} onChange={(e) => upd(i, "length", e.target.value)} />
              <button type="button" className="btn-ghost" aria-label="Удалить"
                onClick={() => setCatches((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled>Опубликовать</button>
          <span className="text-xs text-muted-foreground">Публикация заработает после подключения базы.</span>
        </div>
      </form>
    </Shell>
  );
}
