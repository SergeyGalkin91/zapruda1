import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  BrainCircuit, Check, Compass, Fish, MapPin, Save, Settings2, ShieldCheck,
  Sparkles, UserRound, Waves, LogOut, Pencil, X, MessageSquareText,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { FishingProgressTree } from "@/components/FishingProgressTree";
import { FishingDisciplineTree } from "@/components/FishingDisciplineTree";
import { AnglerTackleCabinet } from "@/components/AnglerTackleCabinet";
import { PrivateFishingMarks } from "@/components/PrivateFishingMarks";
import { ActivityAchievements } from "@/components/ActivityAchievements";
import { FISHING_DISCIPLINES } from "@/lib/disciplines";
import type { FishingSpecialization } from "@/lib/disciplines";
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
  fishing_methods: string[];
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
  fishing_methods: ["Спиннинг"],
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

function ProfileDetail({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">{label}</dt>
    <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm text-zinc-100">{value || "Не указано"}</dd>
  </div>;
}

function Profile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [shareChatCity, setShareChatCity] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AnglerForm>(EMPTY_FORM);
  const [progress, setProgress] = useState<FishingProgress | null>(null);
  const [specializations, setSpecializations] = useState<FishingSpecialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const update = <K extends keyof AnglerForm>(field: K, value: AnglerForm[K]) =>
    setPreferences((current) => ({ ...current, [field]: value }));

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      // Reset private page state with a full navigation after the session is cleared.
      window.location.assign("/");
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : "Не удалось выйти из аккаунта. Попробуй ещё раз.");
      setSigningOut(false);
    }
  }

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

    const [profileResult, prefsResult, progressResult, specializationsResult] = await Promise.all([
      supabase.from("profiles").select("username,display_name,bio,avatar_url,chat_city").eq("id", auth.user.id).maybeSingle(),
      supabase.from("angler_preferences").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.rpc("my_fishing_progress"),
      supabase.rpc("my_fishing_specializations"),
    ]);

    if (profileResult.error) {
      setError("Не удалось загрузить профиль: " + profileResult.error.message);
    } else if (profileResult.data) {
      setUsername(profileResult.data.username ?? "");
      setDisplayName(profileResult.data.display_name ?? "");
      setBio(profileResult.data.bio ?? "");
      setAvatarUrl(profileResult.data.avatar_url);
      setShareChatCity(Boolean(profileResult.data.chat_city));
    }

    if (prefsResult.error) {
      setError((prev) => prev + " Не удалось загрузить рыболовную анкету: " + prefsResult.error.message);
    } else if (prefsResult.data) {
      const row = prefsResult.data;
      setPreferences({
        home_city: row.home_city,
        home_region: row.home_region,
        main_technique: row.main_technique,
        fishing_methods: Array.from(new Set([
          row.main_technique,
          ...((row.fishing_methods ?? []) as string[]),
        ].filter(Boolean))),
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
    if (specializationsResult.error) {
      setError((prev) => prev + " Не удалось загрузить дисциплины: " + specializationsResult.error.message);
      setSpecializations([]);
    } else {
      setSpecializations((specializationsResult.data ?? []).map((row) => ({
        fishing_method: row.fishing_method,
        report_count: Number(row.report_count),
        catches_count: Number(row.catches_count),
        credited_catches: Number(row.credited_catches),
        photo_reports: Number(row.photo_reports),
        distinct_waters: Number(row.distinct_waters),
        heaviest_catch_kg: row.heaviest_catch_kg == null ? null : Number(row.heaviest_catch_kg),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  function toggleMethod(method: string) {
    setPreferences((current) => {
      const selected = current.fishing_methods.includes(method);
      if (selected && current.fishing_methods.length === 1) return current;
      const methods = selected ? current.fishing_methods.filter(code => code !== method) : [...current.fishing_methods, method];
      const primary = methods.includes(current.main_technique) ? current.main_technique : methods[0];
      return { ...current, main_technique: primary, fishing_methods: methods };
    });
  }

  function cancelEditing() {
    setEditing(false);
    setNotice("");
    setError("");
    void loadProfile();
  }

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
    if (!preferences.fishing_methods.length) {
      setError("Выбери хотя бы один способ ловли.");
      return;
    }
    if (shareChatCity && preferences.home_city.trim().length < 2) {
      setError("Чтобы показывать город в общем чате, сначала укажи город рыбалки.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: profileError } = await supabase.from("profiles")
      .update({ username: requestedUsername || null, display_name: displayName.trim() || null, bio: bio.trim() || null, chat_city: shareChatCity ? preferences.home_city.trim() : null })
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
    setNotice("Профиль сохранён. Способы ловли и предпочтения обновлены.");
    setEditing(false);
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
          <div className="flex max-w-full flex-wrap gap-2 sm:justify-end">
            {preferences.fishing_methods.map(method => {
              const item = FISHING_DISCIPLINES.find(entry => entry.code === method);
              return <span key={method} className="inline-flex items-center gap-1.5 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 px-3 py-2 text-xs font-bold text-[#D7FF35]">
                {item?.icon ?? "🎣"} {item?.title ?? method}
              </span>;
            })}
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
              <div className="flex flex-wrap gap-2">
                {!editing && <button type="button" onClick={() => { setError(""); setNotice(""); setEditing(true); }}
                  className="btn-primary inline-flex min-h-10 items-center gap-2">
                  <Pencil className="size-4" /> Редактировать
                </button>}
                <Link to="/assistant" className="inline-flex items-center gap-2 rounded-xl border border-[#D7FF35]/30 px-3 py-2 text-xs font-bold text-[#D7FF35] transition hover:bg-[#D7FF35]/10">
                  <BrainCircuit className="size-4" /> К советнику
                </Link>
              </div>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Label name="Никнейм"><input className="field" maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="например, zaprudafish" /></Label>
                <Label name="Отображаемое имя"><input className="field" maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Как тебя называть?" /></Label>
                <Label name="Город рыбалки"><input className="field" maxLength={100} value={preferences.home_city} onChange={(e) => update("home_city", e.target.value)} placeholder="Нижний Новгород" /></Label>
                <Label name="Регион"><input className="field" maxLength={120} value={preferences.home_region} onChange={(e) => update("home_region", e.target.value)} placeholder="Нижегородская область" /></Label>
                <label className="flex items-start gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-3 text-sm sm:col-span-2">
                  <input type="checkbox" checked={shareChatCity} onChange={e => setShareChatCity(e.target.checked)} className="mt-1 size-4 accent-[#D7FF35]" />
                  <span><strong className="block text-zinc-100">Показывать мой город в общем чате</strong>
                    <span className="mt-1 block text-xs leading-5 text-zinc-400">Например: «river_hunter (Нижний Новгород)». Только название города будет публичным. Рыболовные места, метки и остальная анкета останутся приватными. Можно отключить в любой момент.</span>
                  </span>
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">Мои способы ловли · можно выбрать несколько</p>
                  <div className="flex flex-wrap gap-2">
                    {FISHING_DISCIPLINES.map(item => {
                      const selected = preferences.fishing_methods.includes(item.code);
                      return <button key={item.code} type="button" aria-pressed={selected}
                        onClick={() => toggleMethod(item.code)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${selected ? "border-[#D7FF35] bg-[#D7FF35] text-[#0D100C]" : "border-white/10 bg-[#0E120E] text-zinc-300 hover:border-[#D7FF35]/40"}`}>
                        {selected ? "✓ " : ""}{item.icon} {item.title}
                      </button>;
                    })}
                  </div>
                  <p className="text-xs text-zinc-500">Например, Спиннинг + Фидер. Выбранные способы появятся в шапке профиля. Минимум один.</p>
                </div>
                <Label name="Основной способ для ИИ-советника">
                  <select className="field" value={preferences.main_technique} onChange={(e) => update("main_technique", e.target.value)}>
                    {preferences.fishing_methods.map(method => <option key={method} value={method}>{FISHING_DISCIPLINES.find(x => x.code === method)?.title ?? method}</option>)}
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
                <Label name="Дополнительные заметки о снастях" hint="Для выбора брендов, моделей и размеров используй каталог ниже.">
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
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost inline-flex" type="button" onClick={cancelEditing} disabled={saving}><X className="size-4" /> Отмена</button>
                  <button className="btn-primary" type="submit" disabled={saving}><Save className="size-4" /> {saving ? "Сохраняем…" : "Сохранить профиль"}</button>
                </div>
              </div>
            </form>
            ) : (
              <dl className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileDetail label="Никнейм" value={username ? "@" + username : ""} />
                  <ProfileDetail label="Отображаемое имя" value={displayName} />
                  <ProfileDetail label="Город рыбалки" value={preferences.home_city} />
                  <ProfileDetail label="Регион" value={preferences.home_region} />
                  <ProfileDetail label="С берега или с лодки" value={preferences.fishing_access} />
                  <ProfileDetail label="Транспорт" value={preferences.transport} />
                  <ProfileDetail label="Радиус поиска" value={preferences.search_radius_km + " км"} />
                  <ProfileDetail label="Город в общем чате" value={shareChatCity ? preferences.home_city + " (показывается)" : "Скрыт"} />
                </div>
                <div>
                  <dt className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">Мои способы ловли</dt>
                  <dd className="flex flex-wrap gap-2">
                    {preferences.fishing_methods.map(method => <span key={method} className="rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-2 text-xs font-bold text-[#D7FF35]">
                      {FISHING_DISCIPLINES.find(x => x.code === method)?.icon ?? "🎣"} {method}{method === preferences.main_technique ? " · основной" : ""}
                    </span>)}
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#B6BFB1]">Интересующая рыба</dt>
                  <dd className="flex flex-wrap gap-2">{preferences.target_species.length ? preferences.target_species.map(species =>
                    <span key={species} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-200">{species}</span>)
                    : <span className="text-sm text-zinc-500">Пока не выбраны виды рыб</span>}
                  </dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileDetail label="Заметки о снастях" value={preferences.tackle_text} />
                  <ProfileDetail label="Любимые приманки" value={preferences.favorite_lures} />
                  <ProfileDetail label="Любимые водоёмы" value={preferences.preferred_water} />
                  <ProfileDetail label="Пожелания для ИИ" value={preferences.fishing_notes} />
                  <ProfileDetail label="О себе" value={bio} />
                </div>
                <p className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-zinc-500">
                  <ShieldCheck className="size-4 text-[#D7FF35]" /> Личные снасти, предпочтения и рыболовные метки не публикуются в общем доступе.
                </p>
              </dl>
            )}
          </section>

          <section aria-labelledby="angler-map-title" className="mb-7 overflow-hidden rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / Моя карта</p>
                <h2 id="angler-map-title" className="mt-2 flex items-center gap-2 text-xl font-extrabold text-white">
                  <MapPin className="size-5 text-[#D7FF35]" aria-hidden="true" /> Рыболовная карта региона
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Яндекс Карты по городу из твоего профиля. Найди водоёмы и спланируй выезд.
                  Точные места рыбалки здесь не публикуются.
                </p>
              </div>
              {preferences.home_city.trim() && (
                <a
                  className="btn-ghost inline-flex"
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent([preferences.home_city, preferences.home_region].filter(Boolean).join(", ") + " водоёмы")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть Яндекс Карты ↗
                </a>
              )}
            </div>
            {preferences.home_city.trim() ? (
              <>
                <p className="mb-3 mt-5 text-xs font-semibold text-[#D7FF35]">
                  {preferences.home_city}{preferences.home_region ? ` · ${preferences.home_region}` : ""}
                </p>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0D100C]">
                  <iframe
                    key={preferences.home_city + preferences.home_region}
                    title="Яндекс Карты — водоёмы рядом с городом"
                    src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent([preferences.home_city, preferences.home_region].filter(Boolean).join(", ") + " водоёмы")}`}
                    className="block h-[300px] w-full sm:h-[380px]"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <p className="mt-3 text-xs text-zinc-500">Карта отображается сторонним сервисом Яндекс. Геолокация устройства не запрашивается.</p>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-zinc-300">
                Заполни поле «Город рыбалки» выше и сохрани профиль — здесь появится карта твоего региона.
              </div>
            )}
          </section>

          <PrivateFishingMarks userId={userId} homeCity={preferences.home_city} homeRegion={preferences.home_region} />

          <AnglerTackleCabinet userId={userId} />

          <div className="mb-6 mt-6 flex flex-wrap gap-3">
            <Link to="/guides" className="btn-ghost inline-flex">Кабинет рыболовного гида</Link>
            <Link to="/spearfishing" className="btn-ghost inline-flex">Подводная охота</Link>
          </div>
          {progress ? (
            <><FishingProgressTree progress={progress} /><FishingDisciplineTree stats={specializations} preferredMethod={preferences.main_technique} /></>
          ) : (
            <div className="panel p-5 text-sm text-zinc-400">Пока не удалось загрузить ветку достижений. Попробуй обновить страницу.</div>
          )}

          <ActivityAchievements />

          <section aria-label="Обратная связь и управление аккаунтом" className="mt-10 mb-6 space-y-5 rounded-3xl border border-white/10 bg-[#151A14] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-white">Предложения и сотрудничество</h2>
                <p className="mt-1 text-sm text-zinc-400">Идеи для ZAPRUDA, предложения по улучшению, сообщения об ошибках и партнёрство.</p>
              </div>
              <Link to="/feedback" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#D7FF35]/40 bg-[#D7FF35]/10 px-5 py-2.5 text-sm font-bold text-[#D7FF35] transition hover:border-[#D7FF35]/70 hover:bg-[#D7FF35]/20">
                <MessageSquareText className="size-4" aria-hidden="true" />
                Предложения и сотрудничество
              </Link>
            </div>
            <div className="border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Аккаунт ZAPRUDA</h2>
                  <p className="mt-1 text-sm text-zinc-400">Выйти из аккаунта на этом устройстве.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-bold text-red-200 transition enabled:hover:border-red-300/60 enabled:hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {signingOut ? "Выходим…" : "Выйти из аккаунта"}
                </button>
              </div>
              {signOutError && <p role="alert" className="mt-3 text-sm text-red-300">{signOutError}</p>}
            </div>
          </section>
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
