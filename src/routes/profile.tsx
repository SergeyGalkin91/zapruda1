import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  BrainCircuit, Check, Compass, Fish, MapPin, Save, Settings2, ShieldCheck,
  Sparkles, UserRound, Waves, LogOut, Pencil, X, MessageSquareText, Anchor, Snowflake, Feather, Tent, Ship, Sailboat, Target, CircleDot, Crosshair, Mountain, Droplets, ImagePlus, Flag,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { AnglerTackleCabinet } from "@/components/AnglerTackleCabinet";
import { PrivateFishingMarks } from "@/components/PrivateFishingMarks";
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
  home_country_code: string;
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
  home_country_code: "RU",
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

const DISCIPLINE_ICONS=[Fish,Target,CircleDot,Feather,Snowflake,Tent,Anchor,Waves,Ship,Sailboat,Crosshair,Droplets,Mountain,Flag,Sparkles] as const;
function DisciplineIcon({method,className="size-7"}:{method:string;className?:string}){const i=Math.max(0,FISHING_DISCIPLINES.findIndex(d=>d.code===method));const Icon=DISCIPLINE_ICONS[i];return <Icon className={className} strokeWidth={1.55} aria-hidden="true"/>;}
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

type FeaturedGear = {
  title: string;
  fishingMethod: string;
  rod: string;
  reel: string;
  line: string | null;
};

function Profile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [guideSummary,setGuideSummary]=useState<{title:string;home_city:string;service_mode:string;about:string}|null>(null);
  const [accountRole,setAccountRole]=useState<"angler"|"guide">("angler");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [shareChatCity, setShareChatCity] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSymbol,setAvatarSymbol]=useState<string|null>(null);
  const [avatarBusy,setAvatarBusy]=useState(false);
  const [avatarPanelOpen,setAvatarPanelOpen]=useState(false);
  const [featuredGear, setFeaturedGear] = useState<FeaturedGear | null>(null);
  const [savedTackle, setSavedTackle] = useState<string[]>([]);
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

  const loadFeaturedGear = useCallback(async (id: string) => {
    const { data: saved, error: savedError } = await supabase.from("angler_gear").select("brand,model,variant").eq("user_id", id).order("created_at",{ascending:false}).limit(40);
    if (!savedError) setSavedTackle((saved??[]).map(item=>[item.brand,item.model,item.variant].filter(Boolean).join(" ")));
    const { data: kit, error: kitError } = await (supabase as any)
      .from("angler_gear_sets")
      .select("title,fishing_method,rod_id,reel_id,line_id")
      .eq("user_id", id).eq("is_primary", true).maybeSingle();
    if (kitError || !kit) {
      setFeaturedGear(null);
      return;
    }
    const ids = [kit.rod_id, kit.reel_id, kit.line_id].filter(Boolean) as string[];
    const { data: gear, error: gearError } = await supabase.from("angler_gear")
      .select("id,brand,model,variant").eq("user_id", id).in("id", ids);
    if (gearError || !gear) {
      setFeaturedGear(null);
      return;
    }
    const gearById = new Map(gear.map(item => [item.id, [item.brand,item.model,item.variant].filter(Boolean).join(" ")]));
    const rod = gearById.get(kit.rod_id);
    const reel = gearById.get(kit.reel_id);
    if (!rod || !reel) {
      setFeaturedGear(null);
      return;
    }
    setFeaturedGear({
      title: kit.title || "Основной комплект",
      fishingMethod: kit.fishing_method || "",
      rod,
      reel,
      line: kit.line_id ? gearById.get(kit.line_id) ?? null : null,
    });
  }, []);

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
    setAccountRole(auth.user.user_metadata?.account_role === "guide" ? "guide" : "angler");
    void loadFeaturedGear(auth.user.id);

    setGuideSummary(null);
    void supabase.from("guide_profiles").select("title,home_city,service_mode,about").eq("user_id",auth.user.id).maybeSingle().then(({data})=>setGuideSummary(data??null));
    const [profileResult, prefsResult, progressResult, specializationsResult] = await Promise.all([
      supabase.from("profiles").select("username,display_name,bio,avatar_url,avatar_symbol,chat_city").eq("id", auth.user.id).maybeSingle(),
      supabase.from("angler_preferences").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.rpc("my_fishing_progress"),
      supabase.rpc("my_fishing_specializations_v2"),
    ]);

    if (profileResult.error) {
      setError("Не удалось загрузить профиль: " + profileResult.error.message);
    } else if (profileResult.data) {
      setUsername(profileResult.data.username ?? "");
      setDisplayName(profileResult.data.display_name ?? "");
      setBio(profileResult.data.bio ?? "");
      setAvatarUrl(profileResult.data.avatar_url);
      setAvatarSymbol((profileResult.data as any).avatar_symbol??null);
      setShareChatCity(Boolean(profileResult.data.chat_city));
    }

    // First-time angler onboarding: open the questionnaire automatically.
    // Legacy accounts without an explicit role are unaffected.
    if (auth.user.user_metadata?.account_role === "angler" &&
        auth.user.user_metadata?.onboarding_complete !== true &&
        !prefsResult.data?.home_city && !prefsResult.data?.fishing_notes) {
      setEditing(true);
    }
    if (prefsResult.error) {
      setError((prev) => prev + " Не удалось загрузить рыболовную анкету: " + prefsResult.error.message);
    } else if (prefsResult.data) {
      const row = prefsResult.data;
      setPreferences({
        home_city: row.home_city ?? "",
        home_region: row.home_region ?? "",
        main_technique: row.main_technique || "Спиннинг",
        fishing_methods: Array.from(new Set([
          row.main_technique,
          ...((row.fishing_methods ?? []) as string[]),
        ].filter(Boolean))),
        target_species: row.target_species ?? [],
        fishing_access: row.fishing_access ?? "Берег",
        transport: row.transport ?? "Без машины",
        favorite_lures: row.favorite_lures ?? "",
        tackle_text: row.tackle_text ?? "",
        preferred_water: row.preferred_water ?? "",
        fishing_notes: row.fishing_notes ?? "",
        search_radius_km: row.search_radius_km ?? 30,
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
        credited_reports: Number(row.credited_reports),
        catches_count: Number(row.catches_count),
        credited_catches: Number(row.credited_catches),
        photo_reports: Number(row.photo_reports),
        credited_photo_reports: Number(row.credited_photo_reports),
        distinct_waters: Number(row.distinct_waters),
        active_days: Number(row.active_days),
        distinct_species: Number(row.distinct_species),
        heaviest_catch_kg: row.heaviest_catch_kg == null ? null : Number(row.heaviest_catch_kg),
      })));
    }
    setLoading(false);
  }, [loadFeaturedGear]);

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

  async function uploadAvatar(file?:File){
    if(!file||!userId)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Выбери JPG, PNG или WebP.");return;}
    if(file.size>3*1024*1024){setError("Аватар должен быть не больше 3 МБ.");return;}
    setAvatarBusy(true);setError("");
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const path=userId+"/avatar-"+Date.now()+"."+ext;
    const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){setError("Ошибка загрузки: "+uploadError.message);setAvatarBusy(false);return;}
    const url=supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const {error}=await supabase.from("profiles").update({avatar_url:url,avatar_symbol:null} as any).eq("id",userId);
    if(error)setError("Фото загружено, но профиль не обновился: "+error.message);
    else{setAvatarUrl(url);setAvatarSymbol(null);setNotice("Аватар обновлён.");}
    setAvatarBusy(false);
  }
  async function chooseAvatarSymbol(symbol:string){
    if(!userId||avatarBusy)return;
    setAvatarBusy(true);setError("");
    const {error}=await supabase.from("profiles").update({avatar_url:null,avatar_symbol:symbol} as any).eq("id",userId);
    if(error)setError("Не удалось выбрать значок: "+error.message);
    else{setAvatarUrl(null);setAvatarSymbol(symbol);setNotice("Рыболовный значок сохранён.");}
    setAvatarBusy(false);
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
    // A successful saved profile ends the new-member setup.
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { onboarding_complete: true },
    });
    if (metadataError) console.warn("Не удалось отметить завершение анкеты:", metadataError.message);
    setEditing(false);
    await loadProfile();
    setNotice("Профиль сохранён. Способы ловли и предпочтения обновлены.");
  }

  return (
    <Shell>
      <section className="mb-6 rounded-xl border border-white/10 bg-[#111611] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="size-16 rounded-lg border border-[#D7FF35]/30 object-cover" />
            : <div className="flex size-16 items-center justify-center rounded-lg border border-[#D7FF35]/30 bg-[#D7FF35]/5">{avatarSymbol?<DisciplineIcon method={avatarSymbol} className="size-9 text-[#D7FF35]"/>:<UserRound className="size-8 text-[#D7FF35]" />}</div>}
          <div className="min-w-0 flex-1">
            <button type="button" onClick={()=>setAvatarPanelOpen(x=>!x)} className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#D7FF35] underline underline-offset-4"><ImagePlus className="size-3.5"/> Изменить аватар</button>
            <p className="text-[11px] font-black uppercase tracking-[.20em] text-[#D7FF35]">ZAPRUDA / {accountRole==="guide"?"ГИД":"РЫБАК"}</p>
            <h1 className="mt-1 text-2xl font-black text-white">{displayName||username||"Мой профиль"}</h1>
            <p className="mt-1 text-sm text-zinc-400">{username?"@"+username:"Никнейм не указан"}{(accountRole==="guide"?guideSummary?.home_city:preferences.home_city)?" · "+(accountRole==="guide"?guideSummary?.home_city:preferences.home_city):""}</p>
          </div>
          {!editing && <button type="button" className="btn-primary" onClick={()=>{setError("");setEditing(true)}}>Редактировать профиль</button>}
          <div className="ml-auto flex min-w-[120px] flex-col items-center gap-2 rounded-2xl border border-[#D7FF35]/30 bg-[#D7FF35]/[.055] px-4 py-3 text-[#D7FF35]">
            <DisciplineIcon method={preferences.main_technique} className="size-10"/>
            <span className="text-center text-xs font-black uppercase">{accountRole==="guide"?"ГИД":preferences.main_technique}</span>
            <span className="text-[9px] tracking-widest text-zinc-500">НАПРАВЛЕНИЕ</span>
          </div>
        </div>
        {avatarPanelOpen&&<div className="mt-4 rounded-xl border border-[#D7FF35]/30 bg-black/20 p-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#D7FF35]/40 px-4 py-2 text-xs font-bold text-[#D7FF35]"><ImagePlus className="size-4"/>{avatarBusy?"Загружаем…":"Выбрать фото"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarBusy} onChange={e=>{void uploadAvatar(e.target.files?.[0]);e.target.value="";}}/></label>
          <p className="mt-2 text-xs text-zinc-500">JPG / PNG / WebP до 3 МБ. Либо выбери рыболовный символ:</p>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">{FISHING_DISCIPLINES.map(item=><button type="button" key={item.code} title={item.title} disabled={avatarBusy} onClick={()=>void chooseAvatarSymbol(item.code)} className="flex min-h-12 items-center justify-center rounded-lg border border-white/15 text-[#D7FF35] hover:border-[#D7FF35]"><DisciplineIcon method={item.code} className="size-7"/></button>)}</div>
        </div>}
        {accountRole!=="guide"&&<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="mr-2 text-[10px] font-bold uppercase text-zinc-500">Специализации</span>
          {preferences.fishing_methods.map(method=><span key={method} className="inline-flex items-center gap-1 rounded-full border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-2.5 py-1 text-xs font-bold text-[#D7FF35]"><DisciplineIcon method={method} className="size-4"/>{method}</span>)}
          <button type="button" className="text-xs text-zinc-400 underline" onClick={()=>setEditing(true)}>Изменить</button>
        </div>}
        {accountRole==="guide" ? (
          guideSummary ? <div className="mt-5 border-t border-white/10 pt-5">
            <h2 className="text-xl font-black">{guideSummary.title}</h2>
            <p className="mt-2 text-sm text-zinc-300">{guideSummary.service_mode==="shore"?"Береговой гид":guideSummary.service_mode==="boat"?"Лодочный гид":"Берег и лодка"}</p>
            {guideSummary.about&&<p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-400">{guideSummary.about}</p>}
            <Link to="/guides" className="btn-ghost mt-4 inline-flex">Редактировать услуги гида</Link>
          </div> : <div className="mt-5 border-t border-white/10 pt-4"><p className="text-sm text-zinc-400">Анкета гида ещё не заполнена.</p><Link to="/guides" className="btn-primary mt-3 inline-flex">Завершить профиль гида</Link></div>
        ) : <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Способ ловли</p><p className="mt-1 text-sm text-white">{preferences.fishing_methods.join(", ")||"Не указан"}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Интересующая рыба</p><p className="mt-1 text-sm text-white">{preferences.target_species.join(", ")||"Не указана"}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Формат</p><p className="mt-1 text-sm text-white">{preferences.fishing_access||"Не указан"}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Снасти</p><p className="mt-1 text-sm text-white">{savedTackle.length?savedTackle.join(" · "):(preferences.tackle_text||"Пока не добавлены")}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Любимые приманки</p><p className="mt-1 whitespace-pre-wrap text-sm text-white">{preferences.favorite_lures||"Не указаны"}</p></div>
          {featuredGear&&<div><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Основной комплект</p><p className="mt-1 text-sm text-white">{featuredGear.rod+" · "+featuredGear.reel}</p></div>}
        </div>}
      </section>

      {loading && <div className="panel p-6 text-zinc-400">Загружаем рыболовный профиль и достижения…</div>}
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 p-4 text-sm text-[#D7FF35]"><Check className="size-4" />{notice}</div>}

      {!loading && userId && (
        <>
          <section className={editing ? "mb-8 rounded-xl border border-white/10 bg-[#151915] p-5 sm:p-7" : "hidden"}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D7FF35]">01 / Анкета</p>
                <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">{accountRole==="guide"?"Твой профиль · Гид":"Твой профиль · Рыбак"}</h2>
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
                <Label name="Страна"><select className="field" value={preferences.home_country_code} onChange={e=>update("home_country_code",e.target.value)}>{[["RU","Россия"],["BY","Беларусь"],["KZ","Казахстан"],["AM","Армения"],["AZ","Азербайджан"],["KG","Кыргызстан"],["MD","Молдова"],["TJ","Таджикистан"],["UZ","Узбекистан"],["TM","Туркменистан"]].map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></Label>
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {FISHING_DISCIPLINES.map((item,index) => {
                      const selected = preferences.fishing_methods.includes(item.code);
                      const accent = index % 5 === 0 ? "#FF6A00" : "#D7FF35";
                      return <button key={item.code} type="button" aria-pressed={selected}
                        onClick={() => toggleMethod(item.code)}
                        className={`group relative flex min-h-[166px] flex-col justify-end overflow-hidden rounded-[20px] border px-4 pb-4 pt-16 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF35] ${selected ? "border-[#D7FF35] bg-[#172315] shadow-[inset_0_0_0_1px_rgba(215,255,53,.18),0_8px_28px_rgba(0,0,0,.22)]" : "border-white/10 bg-[#0C1110] hover:border-[#D7FF35]/50 hover:bg-[#141A15]"}`}>
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80" style={{background:`radial-gradient(circle at 90% 8%,${accent}21,transparent 57%),repeating-radial-gradient(circle at 100% -10%,transparent 0px,transparent 28px,${accent}11 29px,transparent 30px)`}}/>
                        <span className="pointer-events-none absolute right-3 top-3 flex size-12 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-[#D7FF35]/80 transition group-hover:scale-110" aria-hidden="true"><DisciplineIcon method={item.code} className="size-8"/></span>
                        <span className="relative mb-1 block text-base font-black leading-tight text-white">{item.title}</span>
                        <span className="relative block text-[11px] leading-[1.45] text-[#A8B5A6]">{item.detail}</span>
                        {selected && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-[#D7FF35]/40 bg-[#D7FF35]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#D7FF35]"><Check className="size-3"/> Выбрано</span>}
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
              <div className="mt-7 space-y-4 border-t border-[#D7FF35]/25 pt-6">
                <div className="flex items-start gap-2 text-xs leading-5 text-zinc-400">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#D7FF35]" />
                  После сохранения откроется готовая анкета. Снасти и личные предпочтения останутся приватными.
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button className="btn-ghost inline-flex min-h-12 items-center gap-2 px-5" type="button" onClick={cancelEditing} disabled={saving}>
                    <X className="size-4" /> Отмена
                  </button>
                  <button className="btn-primary inline-flex min-h-12 flex-1 items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold sm:flex-none" type="submit" disabled={saving} aria-label="Сохранить редактирование профиля">
                    <Save className="size-5" /> {saving ? "Сохраняем изменения…" : "Сохранить редактирование профиля"}
                  </button>
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

          {editing && <AnglerTackleCabinet
            userId={userId}
            fishingMethods={preferences.fishing_methods}
            onGearSetsChange={() => void loadFeaturedGear(userId)}
          />}

          <Link to="/achievements" className="btn-ghost mb-6 inline-flex">Мои достижения</Link>

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
