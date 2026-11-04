import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Соревнования — ZAPRUDA" },
      { name: "description", content: "Командные турниры ZAPRUDA COMMUNITY." },
    ],
  }),
  component: CompetitionsPage,
});

type Competition = {
  id: string;
  title: string;
  area_label: string;
  status: string;
  starts_at: string;
  max_teams: number;
};

function CompetitionsPage() {
  const [uid, setUid] = useState("");
  const [items, setItems] = useState<Competition[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUid(auth.user?.id ?? "");
    const { data, error: qErr } = await supabase
      .from("competitions")
      .select("id,title,area_label,status,starts_at,max_teams")
      .in("status", ["open", "live", "finished"])
      .order("starts_at", { ascending: true })
      .limit(50);
    if (qErr) setError(qErr.message);
    else {
      setError("");
      setItems((data ?? []) as Competition[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Shell>
      <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#243019] to-[#10150E] p-5 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">
          <Trophy className="size-5" /> ZAPRUDA / СОРЕВНОВАНИЯ
        </p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Командные турниры</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Регистрация команд с серверным лимитом слотов. Результаты принимает капитан; модерирует
          организатор.
        </p>
      </header>

      {!uid && (
        <p className="panel mt-5 p-5 text-sm">
          Чтобы участвовать,{" "}
          <Link to="/auth" search={{ mode: "in" }} className="text-[#D7FF35] underline">
            войди в аккаунт
          </Link>
          .
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {loading && <p className="mt-4 text-sm text-zinc-400">Загрузка…</p>}

      <div className="mt-6 grid gap-3">
        {!loading && !items.length && (
          <div className="rounded-2xl border border-white/10 bg-[#151915] p-5 text-sm text-zinc-400">
            Открытых турниров пока нет.
          </div>
        )}
        {items.map((c) => (
          <article key={c.id} className="rounded-2xl border border-white/10 bg-[#151915] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black text-white">{c.title}</h2>
              <span className="rounded-lg border border-[#D7FF35]/30 px-2 py-1 text-xs font-bold text-[#D7FF35]">
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {c.area_label || "Район не указан"} · до {c.max_teams} команд
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(c.starts_at).toLocaleString("ru-RU")}
            </p>
          </article>
        ))}
      </div>
    </Shell>
  );
}
