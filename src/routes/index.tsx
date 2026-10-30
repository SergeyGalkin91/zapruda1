import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X, ArrowUpRight, Compass, Fish, Sparkles, Target, Waves } from "lucide-react";
import { FISHING_DISCIPLINES } from "@/lib/disciplines";
import { Shell } from "@/components/Shell";
import { ReactionBar } from "@/components/ReactionBar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZAPRUDA — лента рыболовных отчётов" },
      { name: "description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
      { property: "og:title", content: "ZAPRUDA — лента рыболовных отчётов" },
      { property: "og:description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
    ],
  }),
  component: Feed,
});

type Report = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  location_name: string | null;
  weather_summary: string | null;
  wind_direction: string | null;
  wind_speed_ms: number | null;
  air_temperature_c: number | null;
  pressure_hpa: number | null;
  user_id: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

function ReportPhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((i) => i === null ? null : (i + 1) % photos.length);
      if (event.key === "ArrowLeft") setActiveIndex((i) => i === null ? null : (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, photos.length]);

  if (!photos.length) return null;
  return (
    <>
      <div className={`grid gap-1.5 overflow-hidden rounded-2xl ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {photos.map((src, index) => (
          <button
            key={index}
            type="button"
            className={`group relative overflow-hidden bg-zinc-900 text-left ${photos.length === 3 && index === 0 ? "col-span-2" : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Открыть фото ${index + 1} из ${photos.length}: ${title}`}
          >
            <img
              src={src}
              loading="lazy"
              alt={`${title} — фото ${index + 1}`}
              className={`w-full object-cover transition duration-300 group-hover:scale-[1.025] ${photos.length === 1 || (photos.length === 3 && index === 0) ? "aspect-[16/10]" : "aspect-[4/3]"}`}
            />
            {index === 0 && photos.length > 1 && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-black/80 px-2.5 py-1.5 text-xs font-semibold text-white">
                <Images className="size-3.5" aria-hidden="true" /> {photos.length} фото
              </span>
            )}
          </button>
        ))}
      </div>
      {activeIndex !== null && (
        <div role="dialog" aria-modal="true" aria-label={`Фотографии: ${title}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-10">
          <button type="button" className="absolute inset-0" aria-label="Закрыть просмотр" onClick={() => setActiveIndex(null)} />
          <img src={photos[activeIndex]} alt={`${title} — фото ${activeIndex + 1}`} className="pointer-events-none relative max-h-[85vh] max-w-[95vw] object-contain" />
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/80 p-3 text-white transition hover:border-lime-300"
            aria-label="Закрыть"
            onClick={() => setActiveIndex(null)}
          >
            <X className="size-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/80 p-3 text-white hover:text-lime-300" aria-label="Предыдущее фото" onClick={() => setActiveIndex((activeIndex - 1 + photos.length) % photos.length)}>
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/80 p-3 text-white hover:text-lime-300" aria-label="Следующее фото" onClick={() => setActiveIndex((activeIndex + 1) % photos.length)}>
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <span className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-xs text-zinc-200">
            {activeIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}

function ReportComments({ reportId }: { reportId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    const { data, error: queryError } = await supabase
      .from("comments")
      .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (queryError) {
      setError("Не удалось загрузить комментарии: " + queryError.message);
      return;
    }
    setComments((data ?? []) as unknown as Comment[]);
    setError("");
  }, [reportId]);

  useEffect(() => {
    void loadComments();
    const channel = supabase
      .channel("report-comments-" + reportId)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: "report_id=eq." + reportId }, () => void loadComments())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadComments, reportId]);

  async function sendComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("Войди в аккаунт, чтобы комментировать.");
      return;
    }
    setSending(true);
    setError("");
    const { error: insertError } = await supabase.from("comments").insert({
      report_id: reportId,
      user_id: auth.user.id,
      body,
    });
    if (insertError) setError("Не удалось отправить комментарий: " + insertError.message);
    else {
      setDraft("");
      await loadComments();
    }
    setSending(false);
  }

  return (
    <section className="border-t pt-4">
      <h3 className="mb-3 text-sm font-semibold">💬 Комментарии ({comments.length})</h3>
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-muted/50 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{comment.profiles?.display_name || comment.profiles?.username || "Рыболов"}</span>
              <span>{new Date(comment.created_at).toLocaleString("ru-RU")}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
          </div>
        ))}
        {!comments.length && <p className="text-xs text-muted-foreground">Пока никто не прокомментировал. Начни обсуждение!</p>}
      </div>
      <form onSubmit={sendComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input className="field flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={userId ? "Написать комментарий…" : "Войди, чтобы комментировать"} maxLength={2000} />
        <button className="btn-primary" disabled={sending || !draft.trim()}>{sending ? "Отправка…" : "Отправить"}</button>
      </form>
      {error && <p className="mt-2 text-xs text-destructive" role="status">{error}</p>}
    </section>
  );
}

function Feed() {
  const PAGE_SIZE = 15;
  const [activeDiscipline,setActiveDiscipline] = useState("Спиннинг");
  const [reports, setReports] = useState<Report[]>([]);
  const [photosByReport, setPhotosByReport] = useState<Record<string, string[]>>({});
  const [commentCounts,setCommentCounts]=useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef(false);

  const loadPage = useCallback(async (reset = false) => {
    if (requestRef.current || (!reset && (!hasMore || loadingMore))) return;
    requestRef.current = true;
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const from = reset ? 0 : reports.length;
    const { data, error: queryError } = await supabase
      .from("fishing_reports")
      .select("id,title,body,created_at,location_name,weather_summary,wind_direction,wind_speed_ms,air_temperature_c,pressure_hpa,user_id,profiles(username,display_name,avatar_url)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (queryError) {
      setError("Не удалось загрузить отчёты: " + queryError.message);
    } else {
      const page = (data ?? []) as unknown as Report[];
      setReports((current) => reset ? page : [...current, ...page.filter((item) => !current.some((old) => old.id === item.id))]);
      setHasMore(page.length === PAGE_SIZE);

      if (reset) setPhotosByReport({});
      if (page.length) {
        const {data:commentRows}=await supabase.from("comments").select("report_id").in("report_id",page.map(r=>r.id));
        const nextCounts:Record<string,number>={};
        for(const comment of commentRows??[]) nextCounts[comment.report_id]=(nextCounts[comment.report_id]??0)+1;
        setCommentCounts(old=>reset?nextCounts:{...old,...nextCounts});
        // The photo table is optional until its migration is applied.
        // Never let a missing gallery backend prevent fishing reports from loading.
        const { data: photoRows, error: photoError } = await supabase
          .from("report_photos")
          .select("report_id,storage_path,sort_order")
          .in("report_id", page.map((report) => report.id))
          .order("sort_order", { ascending: true });

        if (!photoError && photoRows?.length) {
          const { data: signedUrls, error: signingError } = await supabase.storage
            .from("report-photos")
            .createSignedUrls(photoRows.map((photo) => photo.storage_path), 3600);
          if (!signingError && signedUrls) {
            const next: Record<string, string[]> = {};
            photoRows.forEach((photo, index) => {
              const signedUrl = signedUrls[index]?.signedUrl;
              if (signedUrl) (next[photo.report_id] ??= []).push(signedUrl);
            });
            setPhotosByReport((current) => reset ? next : { ...current, ...next });
          }
        }
      }
      setError("");
    }
    setLoading(false);
    setLoadingMore(false);
    requestRef.current = false;
  }, [hasMore, loadingMore, reports.length]);

  useEffect(() => { void loadPage(true); }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadPage(false);
    }, { rootMargin: "700px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, error, loadPage]);

  useEffect(() => {
    const channel = supabase.channel("public-fishing-reports-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fishing_reports" }, (payload) => {
        const fresh = payload.new as { is_public?: boolean };
        if (fresh.is_public) void loadPage(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPage]);


  return (
    <Shell>
      <div className="mx-auto mb-7 max-w-5xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-[#D7FF35]/25 bg-[#0B0F0E] shadow-[0_18px_75px_rgba(0,0,0,.25)]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{background:"radial-gradient(ellipse at 87% 10%, rgba(215,255,53,.19), transparent 46%), radial-gradient(ellipse at 0% 100%, rgba(255,106,0,.12), transparent 48%), repeating-radial-gradient(circle at 78% 62%, transparent 0px, transparent 39px, rgba(215,255,53,.065) 40px, transparent 41px)"}}/>
          <div className="relative grid min-h-[290px] gap-8 p-6 sm:p-10 md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-[#D7FF35]"><span className="size-1.5 animate-pulse rounded-full bg-[#D7FF35]"/> ZAPRUDA COMMUNITY · FISHING CULTURE</p>
              <h1 className="max-w-xl text-[clamp(2.5rem,7.5vw,5.3rem)] font-black uppercase leading-[.88] tracking-[-.065em] text-white">БОЛЬШЕ<br/><span className="text-[#D7FF35]">ЧЕМ РЫБАЛКА.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-[#B5C1B4] sm:text-base">Отчёты, трофеи, люди на одной волне. Твоя рыбалка — твои правила. Найди своих, покажи результат, исследуй новые места.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link to="/reports/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7FF35] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B0F0E] transition hover:bg-[#ECFF92]">+ Новый отчёт <ArrowUpRight className="size-4"/></Link>
                <Link to="/fishing-map" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#FF6A00]/60"><Compass className="size-4 text-[#FF6A00]"/> Карта мест</Link>
              </div>
            </div>
            <div className="relative hidden items-center justify-center md:flex">
              <div className="absolute size-52 rounded-full border border-[#D7FF35]/15"/><div className="absolute size-36 rounded-full border border-[#FF6A00]/25"/>
              <Fish className="relative size-32 -rotate-12 text-[#D7FF35]" strokeWidth={.7} />
              <span className="absolute bottom-2 -rotate-6 rounded-md bg-[#FF6A00] px-3 py-1 text-xs font-black uppercase tracking-widest text-black">NO ORDINARY CLUB</span>
            </div>
          </div>
        </section>
        <section className="rounded-[24px] border border-white/10 bg-[#141A16] p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#FF6A00]">FISHING ID / ТВОЙ КОД</p><h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">Выбери свой стиль</h2><p className="mt-1 text-xs text-[#A8B5A6]">15 направлений. У каждого свой характер, свои достижения.</p></div>
            <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-[#D7FF35] hover:underline">Мои предпочтения <ArrowUpRight className="size-3.5"/></Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {FISHING_DISCIPLINES.map((discipline,index)=><button type="button" key={discipline.code} aria-pressed={activeDiscipline===discipline.code} onClick={()=>setActiveDiscipline(discipline.code)} className={`group relative min-h-[116px] overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${activeDiscipline===discipline.code?"border-[#FF6A00] bg-[#1D231D] shadow-[inset_0_0_0_1px_rgba(255,106,0,.45),0_0_20px_rgba(255,106,0,.12)]":"border-white/10 bg-[#0B0F0E] hover:border-[#D7FF35]/45"}`}>
              <span aria-hidden="true" className="absolute -right-3 -top-5 select-none text-7xl opacity-[.18] grayscale transition group-hover:opacity-35">{discipline.icon}</span>
              <span className={`relative block text-[10px] font-bold tracking-widest ${activeDiscipline===discipline.code?"text-[#FF6A00]":"text-[#7E9180]"}`}>ID / {String(index+1).padStart(2,"0")}</span>
              <span className="relative mt-5 block text-sm font-black text-white">{discipline.title}</span>
              <span className="relative mt-1 block text-[10px] leading-4 text-[#A2AFA3]">{discipline.detail}</span>
            </button>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/[.055] px-4 py-3">
            <p className="flex items-center gap-2 text-xs text-white"><Target className="size-4 shrink-0 text-[#D7FF35]"/><span><strong>{activeDiscipline}</strong> — выбрано для просмотра. Сохрани направление в профиле.</span></p>
            <Link to="/profile" className="inline-flex items-center gap-1.5 text-xs font-black text-[#D7FF35] hover:underline">Настроить профиль <ArrowUpRight className="size-3.5"/></Link>
          </div>
        </section>
        <div className="flex items-center justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#FF6A00]">ZAPRUDA LIVE</p><h2 className="text-xl font-black uppercase text-white">Лента сообщества</h2></div><Link to="/communities" className="text-xs font-bold text-[#D7FF35] hover:underline">Найти своих →</Link></div>
      </div>
      {loading && <div className="panel p-5 text-sm text-muted-foreground">Загружаем отчёты…</div>}
      {error && <div className="mb-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error}</div>}
      {!loading && !error && reports.length === 0 && (
        <div className="panel p-8 text-center">
          <div className="text-3xl">🎣</div>
          <h2 className="mt-3 font-semibold">Пока тихо, как на бесклёвье</h2>
          <p className="mt-1 text-sm text-muted-foreground">Будь первым — опубликуй отчёт о рыбалке.</p>
          <Link to="/reports/new" className="btn-primary mt-4 inline-flex">Создать отчёт</Link>
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <div className="min-w-0">
      {reports.map((report) => {
        const name = report.profiles?.display_name || report.profiles?.username || "Рыболов";
        return (
          <article key={report.id} className="panel mb-4 space-y-3 border-white/10 bg-[#141814] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              {report.profiles?.avatar_url
                ? <img src={report.profiles.avatar_url} alt="" className="size-11 rounded-full object-cover" />
                : <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">🎣</div>}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{name}</div>
                <div className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString("ru-RU")}</div>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs">🐟 Отчёт</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{report.title}</h2>
              {report.body && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-300">{report.body}</p>}
              <Link to="/reports/$id" params={{id:report.id}} className="mt-3 inline-flex text-sm font-semibold text-[#D7FF35]">Читать отчёт и обсуждение →</Link>
            </div>
            <ReportPhotoGallery photos={photosByReport[report.id] ?? []} title={report.title} />
            {report.location_name && <p className="text-xs text-zinc-400">📍 {report.location_name}</p>}
            <ReactionBar reportId={report.id} />
            <Link to="/reports/$id" params={{id:report.id}} className="inline-flex text-sm text-zinc-300 underline underline-offset-4">💬 Комментарии ({commentCounts[report.id]??0}) · вопросы</Link>
          </article>
        );
      })}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      {loadingMore && <div className="py-5 text-center text-sm text-muted-foreground">Подтягиваем следующие отчёты…</div>}
      {!loading && !loadingMore && !hasMore && reports.length > 0 && <p className="py-6 text-center text-xs text-muted-foreground">Ты в курсе всех отчётов на данный момент 🎣</p>}
      {error && !loading && <button type="button" className="btn-ghost mt-3" onClick={() => void loadPage(reports.length === 0)}>Повторить загрузку</button>}
        </div>
        <aside className="hidden">
          <div className="panel border-lime-300/15 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">НАШЕ СООБЩЕСТВО</p><h2 className="mt-3 text-xl font-bold [text-shadow:0_1px_8px_rgba(215,255,0,0.10)]">Не просто улов. Свои на одной волне.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Обмениваемся опытом, честно рассказываем о рыбалках, находим напарников и помогаем друг другу становиться лучше.</p><Link to="/reports/new" className="btn-primary mt-4 w-full">＋ Поделиться историей</Link></div>
          <div className="panel p-4"><h3 className="font-semibold">Подсказка дня 🎯</h3><p className="mt-2 text-sm text-muted-foreground">Укажи приманку, глубину и проводку в отчёте — другим рыболовам будет проще повторить результат.</p></div>
        </aside>
      </div>
    </Shell>
  );
}
