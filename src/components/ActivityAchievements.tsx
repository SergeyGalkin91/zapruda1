import { useCallback, useEffect, useState } from "react";
import { Award, Clock3, FlaskConical, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = { credited_minutes: number; active_days: number; earned_first_hour: boolean; earned_week: boolean; earned_ten_hours: boolean; beta_eligible: boolean };
const zero: Stats = { credited_minutes: 0, active_days: 0, earned_first_hour: false, earned_week: false, earned_ten_hours: false, beta_eligible: false };
const badges = [
  { key: "earned_first_hour", title: "Первый час", desc: "60 минут зачтённой активности" },
  { key: "earned_week", title: "Постоянный участник", desc: "7 разных активных дней" },
  { key: "earned_ten_hours", title: "Старожил ZAPRUDA", desc: "10 часов зачтённой активности" },
  { key: "beta_eligible", title: "Кандидат в тестеры", desc: "30 активных дней и 10 часов" },
] as const;

export function ActivityAchievements() {
  const [stats, setStats] = useState<Stats>(zero);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<"pending" | "approved" | "declined" | null>(null);
  const [applying, setApplying] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    const { data, error: e } = await (supabase as any).from("my_activity_badges")
      .select("credited_minutes,active_days,earned_first_hour,earned_week,earned_ten_hours,beta_eligible")
      .maybeSingle();
    if (e) setError("Не удалось обновить активность: " + e.message);
    else { setError(""); setStats(data || zero); }
    const { data: application, error: applicationError } = await (supabase as any)
      .from("beta_test_applications").select("status").maybeSingle();
    if (!applicationError) setApplicationStatus(application?.status ?? null);
    setBusy(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function apply() {
    if (!stats.beta_eligible || applying || applicationStatus) return;
    setApplying(true); setError("");
    const { data: auth, error: ae } = await supabase.auth.getUser();
    if (ae || !auth.user) {
      setError("Для подачи заявки войди в аккаунт.");
      setApplying(false); return;
    }
    const { error: insertError } = await (supabase as any).from("beta_test_applications")
      .insert({ user_id: auth.user.id });
    setApplying(false);
    if (insertError) setError("Не получилось отправить заявку: " + insertError.message);
    else await refresh();
  }

  return <section className="mb-7 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7" aria-labelledby="activity-achievements">
    <p className="text-xs font-extrabold uppercase tracking-[.19em] text-[#D7FF35]">ZAPRUDA / УРОВЕНЬ АКТИВНОСТИ</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <h2 id="activity-achievements" className="flex items-center gap-2 text-xl font-black"><Award className="size-6 text-[#D7FF35]"/> Ачивки за активность</h2>
      <button type="button" disabled={busy} onClick={() => void refresh()} className="btn-ghost inline-flex"><RefreshCw className="size-4"/> Обновить</button>
    </div>
    <p className="mt-2 text-sm text-zinc-400">Засчитываются интервалы использования при взаимодействии с видимой вкладкой — без накрутки просто открытым окном. Статистика приблизительная, в формате активности, а не секундомера.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-black/10 p-4"><Clock3 className="size-5 text-[#D7FF35]"/><p className="mt-2 text-2xl font-extrabold">{Math.floor(stats.credited_minutes / 60)} ч {stats.credited_minutes % 60} мин</p><p className="text-xs text-zinc-500">Зачтённая активность</p></div>
      <div className="rounded-xl border border-white/10 bg-black/10 p-4"><Award className="size-5 text-[#D7FF35]"/><p className="mt-2 text-2xl font-extrabold">{stats.active_days}</p><p className="text-xs text-zinc-500">Активных дней</p></div>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {badges.map(b => <div key={b.key} className={"rounded-xl border px-4 py-3 " + (stats[b.key] ? "border-[#D7FF35]/50 bg-[#D7FF35]/10" : "border-white/10 bg-black/10 opacity-65")}>
        <p className="text-sm font-bold">{stats[b.key] ? "🏆 " : "🔒 "}{b.title}</p>
        <p className="mt-1 text-xs text-zinc-400">{b.desc}</p>
      </div>)}
    </div>
    <p className="mt-4 flex gap-2 text-xs text-zinc-400"><FlaskConical className="size-5 shrink-0 text-[#D7FF35]"/>
      {stats.beta_eligible ? "Ты соответствуешь критериям кандидата в бета-тестеры. Доступ к закрытому тесту предоставит команда ZAPRUDA после подтверждения, автоматически права не выдаются." : "При 30 активных днях и 10 часах появится право претендовать на закрытый бета-тест обновлений. Доступ не выдаётся автоматически."}
    </p>
    {stats.beta_eligible && (
      <div className="mt-4 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/5 p-4">
        <p className="mb-3 text-sm text-zinc-200">
          {applicationStatus === "pending" ? "Заявка отправлена и ожидает решения команды." :
            applicationStatus === "approved" ? "Заявка на бета-тест одобрена. Дождись приглашения от администрации." :
            applicationStatus === "declined" ? "Заявка рассмотрена. Пока доступ не предоставлен." :
            "Ты выполнил условия. Можешь подать заявку на участие в закрытом тестировании."}
        </p>
        {!applicationStatus && <button type="button" onClick={() => void apply()}
          disabled={applying} className="btn-primary inline-flex">
          <FlaskConical className="size-4" />{applying ? "Отправляем…" : "Подать заявку в бета-тест"}
        </button>}
      </div>
    )}
  </section>;
}
