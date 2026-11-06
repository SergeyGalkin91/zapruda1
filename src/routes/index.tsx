import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Shell } from "@/components/Shell";
import { PremiumFeedHeader } from "@/components/PremiumFeedHeader";
import { ReportBigFishNextStep } from "@/components/ReportBigFishNextStep";
import { BrandFish } from "@/components/Wordmark";
import { ReactionBar } from "@/components/ReactionBar";
import { DailyFishingBrief } from "@/components/DailyFishingBrief";
import { ScreenState } from "@/components/ScreenState";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { loadPublicReportPhotos } from "@/lib/public-report-photos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZAPRUDA — лента рыболовных отчётов" },
      { name: "description", content: "Отчёты рыбаков: водоёмы, снасти, погода и истории с воды." },
      { property: "og:title", content: "ZAPRUDA — лента рыболовных отчётов" },
      {
        property: "og:description",
        content: "Отчёты рыбаков: водоёмы, снасти, погода и истории с воды.",
      },
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
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function ReportPhotoGallery({
  photos,
  title,
  onPhotoError,
}: {
  photos: string[];
  title: string;
  onPhotoError: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!photos.length) return null;
  const index = activeIndex === null ? null : Math.min(activeIndex, photos.length - 1);
  const move = (step: number) => {
    if (index !== null) setActiveIndex((index + step + photos.length) % photos.length);
  };
  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
      <div
        className={`grid gap-1.5 overflow-hidden rounded-[20px] border border-white/10 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {photos.map((src, index) => (
          <button
            key={index}
            type="button"
            className={`group relative overflow-hidden bg-zinc-900 text-left ${photos.length === 3 && index === 0 ? "col-span-2" : ""}`}
            onClick={(event) => {
              opener.current = event.currentTarget;
              setActiveIndex(index);
            }}
            aria-label={`Открыть фото ${index + 1} из ${photos.length}: ${title}`}
          >
            <img
              src={src}
              onError={onPhotoError}
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
      {index !== null && (
        <DialogContent
          className="z-photo-lightbox"
          onCloseAutoFocus={(event) => {
            if (!opener.current?.isConnected) return;
            event.preventDefault();
            opener.current.focus();
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }}
        >
          <DialogTitle className="sr-only">Фотографии: {title}</DialogTitle>
          <DialogDescription className="sr-only">
            Просматривай фото свайпом, кнопками или стрелками клавиатуры.
          </DialogDescription>
          <div
            className="z-photo-frame"
            onClick={(event) => {
              if (event.target === event.currentTarget) setActiveIndex(null);
            }}
            onTouchStart={(event) => {
              const touch = event.touches.length === 1 ? event.touches[0] : undefined;
              touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchCancel={() => {
              touchStart.current = null;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              const end = event.changedTouches[0];
              touchStart.current = null;
              if (!start || !end || photos.length < 2) return;
              const dx = end.clientX - start.x;
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(end.clientY - start.y)) {
                move(dx < 0 ? 1 : -1);
              }
            }}
          >
            <img
              src={photos[index]}
              onError={onPhotoError}
              alt={`${title} — фото ${index + 1}`}
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="z-photo-previous absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/80 p-3 text-white hover:text-lime-300"
                aria-label="Предыдущее фото"
                onClick={() => move(-1)}
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                className="z-photo-next absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/80 p-3 text-white hover:text-lime-300"
                aria-label="Следующее фото"
                onClick={() => move(1)}
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <span
            role="status"
            className="z-photo-count pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-xs text-zinc-200"
          >
            {index + 1} / {photos.length}
          </span>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ReportComments({ reportId }: { reportId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const commentsRequestSeq = useRef(0);

  const loadComments = useCallback(async () => {
    const request = ++commentsRequestSeq.current;
    const { data: auth } = await supabase.auth.getUser();
    if (request !== commentsRequestSeq.current) return;
    setUserId(auth.user?.id ?? null);
    const { data, error: queryError } = await supabase
      .from("comments")
      .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (request !== commentsRequestSeq.current) return;
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: "report_id=eq." + reportId },
        () => void loadComments(),
      )
      .subscribe();
    return () => {
      commentsRequestSeq.current += 1;
      void supabase.removeChannel(channel);
    };
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
              <span className="font-semibold text-foreground">
                {comment.profiles?.display_name || comment.profiles?.username || "Рыболов"}
              </span>
              <span>{new Date(comment.created_at).toLocaleString("ru-RU")}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
          </div>
        ))}
        {!comments.length && (
          <p className="text-xs text-muted-foreground">
            Пока никто не прокомментировал. Начни обсуждение!
          </p>
        )}
      </div>
      <form onSubmit={sendComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="field flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={userId ? "Написать комментарий…" : "Войди, чтобы комментировать"}
          maxLength={2000}
        />
        <button className="btn-primary" disabled={sending || !draft.trim()}>
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="status">
          {error}
        </p>
      )}
    </section>
  );
}

function Feed() {
  const PAGE_SIZE = 15;
  const [reports, setReports] = useState<Report[]>([]);
  const [photosByReport, setPhotosByReport] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<{ message: string; firstPage: boolean } | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef(false);
  const initialPageRequested = useRef(false);
  const photoRetries = useRef(new Map<string, { at: number; pending: boolean }>());
  const refreshPhotos = useCallback((reportId: string) => {
    const last = photoRetries.current.get(reportId);
    if (last?.pending || (last && Date.now() - last.at < 10_000)) return;
    const attempt = { at: Date.now(), pending: true };
    photoRetries.current.set(reportId, attempt);
    void loadPublicReportPhotos([reportId])
      .then((next) => {
        setPhotosByReport((current) => ({ ...current, [reportId]: next[reportId] ?? [] }));
      })
      .catch(() => {
        setPhotosByReport((current) => ({ ...current, [reportId]: [] }));
      })
      .finally(() => {
        attempt.pending = false;
      });
  }, []);

  const loadPage = useCallback(
    async (reset = false) => {
      if (requestRef.current || (!reset && (!hasMore || loadingMore))) return;
      requestRef.current = true;
      setError(null);
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const from = reset ? 0 : reports.length;
        const { data, error: queryError } = await supabase
          .from("fishing_reports")
          .select(
            "id,title,body,created_at,location_name,weather_summary,wind_direction,wind_speed_ms,air_temperature_c,pressure_hpa,user_id,profiles(username,display_name,avatar_url)",
          )
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (queryError) {
          setError({ message: "Не удалось загрузить отчёты.", firstPage: reset });
        } else {
          const page = (data ?? []) as unknown as Report[];
          setReports((current) =>
            reset
              ? page
              : [...current, ...page.filter((item) => !current.some((old) => old.id === item.id))],
          );
          setHasMore(page.length === PAGE_SIZE);

          if (reset) setPhotosByReport({});
          if (page.length) {
            // The photo table is optional until its migration is applied.
            // Never let a missing gallery backend prevent fishing reports from loading.
            try {
              const next = await loadPublicReportPhotos(page.map((report) => report.id));
              setPhotosByReport((current) => (reset ? next : { ...current, ...next }));
            } catch {
              // The gallery remains optional; never fall back to an original file.
            }
          }
        }
      } catch {
        setError({ message: "Не удалось загрузить отчёты.", firstPage: reset });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        requestRef.current = false;
      }
    },
    [hasMore, loadingMore, reports.length],
  );

  useEffect(() => {
    if (initialPageRequested.current) return;
    initialPageRequested.current = true;
    void loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadPage(false);
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, error, loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("public-fishing-reports-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fishing_reports" },
        (payload) => {
          const fresh = payload.new as { is_public?: boolean };
          if (fresh.is_public) void loadPage(true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  return (
    <Shell screen="feed">
      <PremiumFeedHeader />
      <ReportBigFishNextStep />
      {loading && <ScreenState kind="loading">Загружаем отчёты…</ScreenState>}
      {error?.firstPage && (
        <ScreenState kind="error" className="mb-4" onRetry={() => void loadPage(true)}>
          {error.message}
        </ScreenState>
      )}
      {!loading && !error && reports.length === 0 && (
        <div className="panel z-feed-empty text-center" role="status">
          <BrandFish className="z-empty-fish" />
          <h2 className="mt-3 font-semibold">Пока тихо, как на бесклёвье</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Будь первым — опубликуй отчёт о рыбалке.
          </p>
          <Link to="/reports/new" className="btn-primary mt-4 inline-flex">
            Создать отчёт
          </Link>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          {reports.map((report) => {
            const name = report.profiles?.display_name || report.profiles?.username || "Рыболов";
            return (
              <article
                key={report.id}
                className="z-underground z-feed-card mb-5 space-y-4 overflow-hidden p-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:p-5"
              >
                <div className="flex items-start gap-3">
                  {report.profiles?.avatar_url ? (
                    <img
                      src={report.profiles.avatar_url}
                      alt=""
                      className="size-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">
                      🎣
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-white">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <span className="rounded-full border border-[#A78BFA]/35 bg-[#A78BFA]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#C4B5FD]">
                    Выезд / Отчёт
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-[-0.035em] text-white sm:text-2xl">
                    {report.title}
                  </h2>
                  {report.body && <p className="mt-2 whitespace-pre-wrap text-sm">{report.body}</p>}
                </div>
                <ReportPhotoGallery
                  photos={photosByReport[report.id] ?? []}
                  title={report.title}
                  onPhotoError={() => refreshPhotos(report.id)}
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  {report.location_name && (
                    <div className="space-y-2">
                      <a
                        href={`https://yandex.ru/maps/?text=${encodeURIComponent(report.location_name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-3 py-1.5 text-xs text-[#DDD6FE] transition hover:border-[#D7FF35]/40 hover:text-[#D7FF35]"
                      >
                        📍 {report.location_name} · Открыть в Яндекс Картах ↗
                      </a>
                      <div className="overflow-hidden rounded-xl border border-border/70">
                        <iframe
                          title={`Карта: ${report.location_name}`}
                          src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(report.location_name)}`}
                          width="100%"
                          height="220"
                          frameBorder="0"
                          allowFullScreen
                          loading="lazy"
                          className="block w-full"
                        />
                      </div>
                    </div>
                  )}
                  {report.weather_summary && (
                    <span className="rounded-full bg-secondary px-3 py-1.5">
                      🌦️ {report.weather_summary}
                    </span>
                  )}
                  {report.air_temperature_c != null && (
                    <span className="rounded-full bg-secondary px-3 py-1.5">
                      🌡️ {report.air_temperature_c}°C
                    </span>
                  )}
                  {report.wind_direction && (
                    <span className="rounded-full bg-secondary px-3 py-1.5">
                      💨 {report.wind_direction}
                      {report.wind_speed_ms != null ? `, ${report.wind_speed_ms} м/с` : ""}
                    </span>
                  )}
                  {report.pressure_hpa != null && (
                    <span className="rounded-full bg-secondary px-3 py-1.5">
                      🧭 {Math.round(report.pressure_hpa / 1.33322)} мм рт. ст.
                    </span>
                  )}
                </div>
                <ReactionBar reportId={report.id} />
                <ReportComments reportId={report.id} />
              </article>
            );
          })}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />
          {loadingMore && <ScreenState kind="loading">Подтягиваем следующие отчёты…</ScreenState>}
          {!loading && !loadingMore && !hasMore && reports.length > 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Ты в курсе всех отчётов на данный момент 🎣
            </p>
          )}
          {error && !error.firstPage && (
            <ScreenState kind="error" onRetry={() => void loadPage(false)}>
              {error.message}
            </ScreenState>
          )}
        </div>
        <aside className="hidden space-y-4 lg:block">
          <div className="panel border-lime-300/15 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              НАШЕ СООБЩЕСТВО
            </p>
            <h2 className="mt-3 text-xl font-bold [text-shadow:0_1px_8px_rgba(215,255,0,0.10)]">
              Не просто улов. Свои на одной волне.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Обмениваемся опытом, честно рассказываем о рыбалках, находим напарников и помогаем
              друг другу становиться лучше.
            </p>
            <Link to="/reports/new" className="btn-primary mt-4 w-full">
              ＋ Поделиться историей
            </Link>
          </div>
          <div className="panel p-4">
            <h3 className="font-semibold">Подсказка дня 🎯</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Укажи приманку, глубину и проводку в отчёте — другим рыболовам будет проще повторить
              результат.
            </p>
          </div>
        </aside>
      </div>
      <DailyFishingBrief />
    </Shell>
  );
}
