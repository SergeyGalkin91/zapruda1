import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  BrainCircuit, Check, Compass, Fish, MapPin, Save, Settings2, ShieldCheck,
  Sparkles, UserRound, Waves,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { FishingProgressTree } from "@/components/FishingProgressTree";
import { supabase } from "@/integrations/supabase/client";
import type { FishingProgress } from "@/lib/progression";
import { EMPTY_PROGRESS } from "@/lib/progression";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Профиль рыболова и достижения — ZAPRUDA" },
      { name: "description", content: "Настройки снастей, любимые виды рыбы, XP, уровни и достижения рыболова." },
    ],
  }),
  component: Profile,
});

type AnglerForm = {
  home_city: string;
  home_region: string;
  main_technique: string;
  target_species: string[];
  fishing_access: string;
  transport: string;
  favorite_lures: string;
  tackle_text: string;
  preferred_water: string;
  fishing_notes: string;
  search_radius_km: number;
};

const EMPTY_FORM: AnglerForm = {
  home_city: "",
  home_region: "",
  main_technique: "Спиннинг",
  target_species: [],
  fishing_access: "Берег",
  transport: "Без машины",
  favorite_lures: "",
  tackle_text: "",
  preferred_water: "",
  fishing_notes: "",
  search_radius_km: 30,
};

const SPECIES = ["Щука", "Судак", "Окунь", "Жерех", "Голавль", "Форель", "Карп", "Сом", "Лещ", "Карась"] as const;

function Label({ name, children, hint }: { name: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">{name}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

function Profile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AnglerForm>(EMPTY_FORM);
  const [progress, setProgress] = useState<FishingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const update = <K extends keyof AnglerForm>(field: K, value: AnglerForm[K]) =>
    setPreferences((current) => ({ ...current, [field]: value }));

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setLoading(false);
      setUserId(null);
      setError(authError?.message || "Чтобы заполнить профиль, войди в аккаунт.");
      return;
    }
    setUserId(auth.user.id);
    setEmail(auth.user.email ?? "");

    const [profileResult, prefsResult, progressResult] = await Promise.all([
      supabase.from("profiles").select("username,display_name,bio,avatar_url").eq("id", auth.user.id).maybeSingle(),
      supabase.from("angler_preferences").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.rpc("my_fishing_progress"),
    ]);

    if (profileResult.error) {
      setError("Не удалось загрузить профиль: " + profileResult.error.message);
    } else if (profileResult.data) {
      setUsername(profileResult.data.username ?? "");
      setDisplayName(profileResult.data.display_name ?? "");
      setBio(profileResult.data.bio ?? "");
      setAvatarUrl(profileResult.data.avatar_url);
    }

    if (prefsResult.error) {
      setError((prev) => prev + " Не удалось загрузить рыболовную анкету: " + prefsResult.error.message);
    } else if (prefsResult.data) {
      const row = prefsResult.data;
      setPreferences({
        home_city: row.home_city,
        home_region: row.home_region,
        main_technique: row.main_technique,
        target_species: row.target_species,
        fishing_access: row.fishing_access,
        transport: row.transport,
        favorite_lures: row.favorite_lures,
        tackle_text: row.tackle_text,
        preferred_water: row.preferred_water,
        fishing_notes: row.fishing_notes,
        search_radius_km: row.search_radius_km,
      });
    }

    if (progressResult.error) {
      setProgress(null);
      setError((prev) => prev + " Не удалось рассчитать достижения: " + progressResult.error.message);
    } else {
      const raw = progressResult.data?.[0];
      setProgress(raw ? {
        report_count: Number(raw.report_count),
        catches_count: Number(raw.catches_count),
        photo_count: Number(raw.photo_count),
        photo_reports: Number(raw.photo_reports),
        reactions_received: Number(raw.reactions_received),
        trips_organized: Number(raw.trips_organized),
        heaviest_catch_kg: raw.heaviest_catch_kg == null ? null : Number(raw.heaviest_catch_kg),
      } : EMPTY_PROGRESS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  function toggleSpecies(species: string) {
    setPreferences((current) => ({
      ...current,
      target_species: current.target_species.includes(species)
        ? current.target_species.filter((item) => item !== species)
        : current.target_species.length >= 10
          ? current.target_species
          : [...current.target_species, species],
    }));
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || saving) return;
    const requestedUsername = username.trim();
    if (requestedUsername && !/^[a-zA-Z0-9_.-]{3,30}$/.test(requestedUsername)) {
      setError("Никнейм: от 3 до 30 символов, латинские буквы, цифры, точка, дефис или подчёркивание.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: profileError } = await supabase.from("profiles")
      .update({ username: requestedUsername || null, display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq("id", userId);
    if (profileError) {
      setError("Не удалось сохранить имя и описание: " + profileError.message);
      setSaving(false);
      return;
    }

    const { error: prefsError } = await supabase.from("angler_preferences").upsert({
      user_id: userId,
      ...preferences,
      home_city: preferences.home_city.trim(),
      home_region: preferences.home_region.trim(),
      favorite_lures: preferences.favorite_lures.trim(),
      tackle_text: preferences.tackle_text.trim(),
      preferred_water: preferences.preferred_water.trim(),
      fishing_notes: preferences.fishing_notes.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (prefsError) {
      setError("Имя сохранено, но настройки рыбалки не обновлены: " + prefsError.message);
      return;
    }
    setNotice("Рыболовный профиль сохранён. ИИ-рыболов сможет использовать эти предпочтения.");
  }

  return (
    <Shell>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-r from-[#1B2416] via-[#121712] to-[#0D100C] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#D7FF35]/10 blur-3xl" />
        <p className="relative text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / Профиль рыболова</p>
        <div className="relative mt-4 flex flex-wrap items-center gap-4">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="size-20 rounded-full border-2 border-[#D7FF35]/40 object-cover" />
            : <div className="flex size-20 items-center justify-center rounded-full border border-[#D7FF35]/35 bg-[#D7FF35]/10"><UserRound className="size-9 text-[#D7FF35]" /></div>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{displayName || username || "Мой рыболовный профиль"}</h1>
            <p className="mt-1 text-sm text-[#A6B1A0]">{username ? "@" + username : "Укажи никнейм"}{preferences.home_city ? " · " + preferences.home_city : ""}</p>
            <p className="mt-2 text-xs text-zinc-400">{bio || "Расскажи, где и на что любишь ловить."}</p>
          </div>
          <div className="rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/10 px-4 py-3 text-xs font-bold text-[#D7FF35]">
            <Fish className="mr-1 inline size-4" /> {preferences.main_technique}
          </div>
        </div>
      </section>

      {loading && <div className="panel p-6 text-zinc-400">Загружаем рыболовный профиль и достижения…</div>}
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 p-4 text-sm text-[#D7FF35]"><Check className="size-4" />{notice}</div>}

      {!loading && userId && (
        <>
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#151915] p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D7FF35]">01 / Анкета</p>
                <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Твой рыболовный профиль</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">Именно эти данные используются для персонального подбора мест: город, транспорт, способы ловли, приманки и снасти.</p>
              </div>
              <Link to="/assistant" className="inline-flex items-center gap-2 rounded-xl border border-[#D7FF35]/30 px-3 py-2 text-xs font-bold text-[#D7FF35] transition hover:bg-[#D7FF35]/10">
                <BrainCircuit className="size-4" /> К советнику
              </Link>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Label name="Никнейм"><input className="field" maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="например, zaprudafish" /></Label>
                <Label name="Отображаемое имя"><input className="field" maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Как тебя называть?" /></Label>
                <Label name="Город рыбалки"><input className="field" maxLength={100} value={preferences.home_city} onChange={(e) => update("home_city", e.target.value)} placeholder="Нижний Новгород" /></Label>
                <Label name="Регион"><input className="field" maxLength={120} value={preferences.home_region} onChange={(e) => update("home_region", e.target.value)} placeholder="Нижегородская область" /></Label>
                <Label name="Основной способ ловли">
                  <select className="field" value={preferences.main_technique} onChange={(e) => update("main_technique", e.target.value)}>
                    {["Спиннинг","Фидер","Поплавок","Нахлыст","Зимняя рыбалка","Другое"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Label>
                <Label name="С берега или с лодки">
                  <select className="field" value={preferences.fishing_access} onChange={(e) => update("fishing_access", e.target.value)}>
                    {["Берег","Лодка","Берег и лодка"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Label>
                <Label name="Транспорт">
                  <select className="field" value={preferences.transport} onChange={(e) => update("transport", e.target.value)}>
                    {["Без машины","Есть машина","Общественный транспорт","Любой"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Label>
                <Label name="Радиус поиска, км" hint="Фильтрация по расстоянию появится после подключения геокодирования и координат водоёмов.">
                  <input className="field" type="number" min={1} max={300} value={preferences.search_radius_km} onChange={(e) => update("search_radius_km", Math.max(1, Math.min(300, Number(e.target.value) || 1)))} />
                </Label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">Какую рыбу хочешь ловить</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map((species) => {
                    const selected = preferences.target_species.includes(species);
                    return (
                      <button key={species} type="button" aria-pressed={selected}
                        onClick={() => toggleSpecies(species)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${selected ? "border-[#D7FF35] bg-[#D7FF35] text-[#0D100C]" : "border-white/10 bg-[#0E120E] text-zinc-300 hover:border-[#D7FF35]/40"}`}>
                        {selected ? "✓ " : ""}{species}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Label name="Мои снасти" hint="Укажи спиннинги, тесты, катушки и плетёнку.">
                  <textarea className="field min-h-32" maxLength={1600} value={preferences.tackle_text} onChange={(e) => update("tackle_text", e.target.value)} placeholder={"Narval Euphoria 10–42 г\nDaiwa Prorex LT 3000\nШнур PE #1.2"} />
                </Label>
                <Label name="Любимые приманки" hint="Важен вес и тип: поможет подобрать технику.">
                  <textarea className="field min-h-32" maxLength={800} value={preferences.favorite_lures} onChange={(e) => update("favorite_lures", e.target.value)} placeholder="Джиг 10–22 г, силикон 4–6”, колебалки, пилькеры…" />
                </Label>
                <Label name="Любимые водоёмы">
                  <textarea className="field min-h-24" maxLength={500} value={preferences.preferred_water} onChange={(e) => update("preferred_water", e.target.value)} placeholder="Ока, Волга, малые реки, озёра…" />
                </Label>
                <Label name="Пожелания для ИИ">
                  <textarea className="field min-h-24" maxLength={800} value={preferences.fishing_notes} onChange={(e) => update("fishing_notes", e.target.value)} placeholder="Например: только с берега, люблю рассвет, интересует судак…" />
                </Label>
              </div>
              <Label name="О себе">
                <textarea className="field min-h-20" maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Несколько слов для других рыбаков" />
              </Label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="size-4 text-[#D7FF35]" /> Снасти и предпочтения доступны только тебе и твоему персональному советнику.</div>
                <button className="btn-primary" type="submit" disabled={saving}><Save className="size-4" /> {saving ? "Сохраняем…" : "Сохранить профиль"}</button>
              </div>
            </form>
          </section>

          {progress ? (
            <FishingProgressTree progress={progress} />
          ) : (
            <div className="panel p-5 text-sm text-zinc-400">Пока не удалось загрузить ветку достижений. Попробуй обновить страницу.</div>
          )}
        </>
      )}
      {!loading && !userId && (
        <div className="panel p-7 text-center">
          <Settings2 className="mx-auto size-9 text-[#D7FF35]" />
          <h2 className="mt-4 text-lg font-bold">Войди, чтобы прокачивать рыболова</h2>
          <p className="mt-2 text-sm text-zinc-400">Анкета, ранги, XP и достижения привязаны к твоему аккаунту.</p>
          <Link to="/auth" className="btn-primary mt-5 inline-flex">Войти в ZAPRUDA</Link>
        </div>
      )}
    </Shell>
  );
}
