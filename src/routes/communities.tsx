import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, NotConnected } from "@/components/Shell";
import { countries, topics } from "@/lib/geo";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Сообщества — ZAPRUDA" },
      { name: "description", content: "Чаты рыболовов по странам, регионам, городам и интересам." },
      { property: "og:title", content: "Сообщества — ZAPRUDA" },
      { property: "og:description", content: "Чаты рыболовов по странам, регионам, городам и интересам." },
    ],
  }),
  component: Communities,
});

function Communities() {
  const [country, setCountry] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const cis = countries.filter((c) => c.group === "cis");
  const special = countries.filter((c) => c.group === "special");
  const Chip = ({ c }: { c: (typeof countries)[number] }) => (
    <button
      onClick={() => setCountry(c.code)}
      className={`panel flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold ${country === c.code ? "border-primary" : ""}`}
    >
      <span className="text-lg">{c.flag}</span>{c.name}
    </button>
  );
  const sel = countries.find((c) => c.code === country);

  return (
    <Shell>
      <h1 className="text-3xl font-bold">Сообщества</h1>
      <Link to="/chat" className="panel mt-6 flex items-center justify-between p-5 hover:border-primary">
        <div>
          <p className="font-display font-bold">Весь ZAPRUDA</p>
          <p className="text-sm text-muted-foreground">Общий чат рыбаков со всего сообщества</p>
        </div>
        <span className="text-primary">→</span>
      </Link>

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-muted-foreground">Страны СНГ</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{cis.map((c) => <Chip key={c.code} c={c} />)}</div>
      <h2 className="mt-6 mb-3 text-sm uppercase tracking-widest text-muted-foreground">Отдельный раздел</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{special.map((c) => <Chip key={c.code} c={c} />)}</div>

      {sel && (
        <section className="mt-6 space-y-3">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Регион или город — ${sel.name}`} />
          <NotConnected what="Регионы, города и городские чаты" />
        </section>
      )}

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-muted-foreground">По интересам</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => <span key={t} className="btn-ghost">{t}</span>)}
      </div>
    </Shell>
  );
}
