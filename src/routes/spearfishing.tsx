import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Check, Compass, Fish, MapPin, Save, ShieldCheck, Users, Waves } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/spearfishing")({
  head: () => ({ meta: [
    { title: "Подводная охота — ZAPRUDA" },
    { name: "description", content: "Отдельное направление подводной охоты: профиль, напарники, отчёты и безопасность." },
  ] }),
  component: Spearfishing,
});

type SpearfishingProfile = {
  user_id: string;
  home_city: string;
  preferred_waters: string;
  experience_years: number | null;
  activity_style: string;
  access_type: string;
  equipment_overview: string;
  buddy_notes: string;
  safety_training_self_reported: boolean;
  buddy_only: boolean;
  publicly_listed: boolean;
};

const EMPTY: Omit<SpearfishingProfile,"user_id"> = {
  home_city: "",
  preferred_waters: "",
  experience_years: null,
  activity_style: "Пресноводная",
  access_type: "С берега",
  equipment_overview: "",
  buddy_notes: "",
  safety_training_self_reported: false,
  buddy_only: true,
  publicly_listed: false,
};

function Field({ title,children }: { title:string; children:ReactNode }) {
  return <label className="block space-y-1.5">
    <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-400">{title}</span>
    {children}
  </label>;
}

function Spearfishing() {
  const [id,setId]=useState<string|null>(null);
  const [form,setForm]=useState<Omit<SpearfishingProfile,"user_id">>(EMPTY);
  const [profiles,setProfiles]=useState<SpearfishingProfile[]>([]);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  function update<K extends keyof typeof EMPTY>(key:K,value:(typeof EMPTY)[K]) {
    setForm((old)=>({...old,[key]:value}));
  }

  const load=useCallback(async()=>{
    setLoading(true);
    setError("");
    const {data:auth}=await supabase.auth.getUser();
    setId(auth.user?.id??null);
    const [mine,list]=await Promise.all([
      auth.user ? supabase.from("spearfishing_profiles").select("*").eq("user_id",auth.user.id).maybeSingle() : Promise.resolve({data:null,error:null}),
      supabase.from("spearfishing_profiles").select("user_id,home_city,preferred_waters,experience_years,activity_style,access_type,equipment_overview,buddy_notes,safety_training_self_reported,buddy_only,publicly_listed").eq("publicly_listed",true).limit(30),
    ]);
    if(mine.error||list.error) setError("Не удалось загрузить анкеты: "+(mine.error?.message??list.error?.message));
    if(mine.data) {
      const {user_id,...rest}=mine.data;
      setForm(rest);
    }
    setProfiles((list.data??[]) as SpearfishingProfile[]);
    setLoading(false);
  },[]);

  useEffect(()=>{void load()},[load]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!id||working)return;
    setError("");
    setNotice("");
    setWorking(true);
    const {error:saveError}=await supabase.from("spearfishing_profiles").upsert({
      ...form,
      user_id:id,
      home_city:form.home_city.trim(),
      preferred_waters:form.preferred_waters.trim(),
      equipment_overview:form.equipment_overview.trim(),
      buddy_notes:form.buddy_notes.trim(),
      buddy_only:true,
      updated_at:new Date().toISOString(),
    },{onConflict:"user_id"});
    setWorking(false);
    if(saveError)setError("Не получилось сохранить анкету: "+saveError.message);
    else{
      setNotice("Анкета сохранена. Сведения о подготовке являются самозаявленными.");
      await load();
    }
  }

  return <Shell>
    <section className="relative overflow-hidden rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-br from-[#173425] via-[#132019] to-[#0B130F] p-6 sm:p-9">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#D7FF35]/10 blur-3xl" />
      <p className="relative text-xs font-black uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / UNDERWATER</p>
      <h1 className="relative mt-3 text-2xl font-black text-white sm:text-4xl">Подводная охота</h1>
      <p className="relative mt-3 max-w-xl text-sm leading-6 text-zinc-300">
        Отдельное направление сообщества для подводных охотников: личная анкета,
        подбор напарника и тематические достижения.
      </p>
      <div className="relative mt-5 flex flex-wrap gap-3">
        <Link to="/partners" className="btn-primary"><Users className="size-4"/>Найти напарника</Link>
        <Link to="/reports/new" className="btn-ghost"><Fish className="size-4"/>Опубликовать отчёт</Link>
        <Link to="/profile" className="btn-ghost"><Waves className="size-4"/>Ветка достижений</Link>
      </div>
    </section>

    <div className="mt-5 rounded-2xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-[#D7FF35]"><ShieldCheck className="size-5"/>Безопасность — прежде всего</p>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-zinc-300">
        Не планируй погружение в одиночку. Учитывай реальную подготовку, состояние воды,
        местные правила и ограничения подводной охоты. ZAPRUDA не проверяет уровень
        подготовки участников и не гарантирует безопасность совместных выездов.
        Глубина, задержка дыхания и рискованные погружения не используются для игровых наград.
      </p>
    </div>

    {loading&&<p className="panel mt-5 p-6 text-sm text-zinc-400">Загружаем раздел…</p>}
    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-5 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 p-4 text-sm text-[#D7FF35]"><Check className="mr-2 inline size-4"/>{notice}</p>}

    {!loading&&<section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-3xl border border-white/10 bg-[#151915] p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">01 / Профиль подводного охотника</p>
        <h2 className="mt-2 text-xl font-black">Моя анкета</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Заполни условия и предпочтения для поиска напарника. Анкета закрыта, пока ты не включишь показ сообществу.</p>
        {!id ? <p className="mt-5 text-sm text-zinc-400">Чтобы заполнить анкету, <Link to="/auth" className="text-[#D7FF35] underline">войди в аккаунт</Link>.</p>
        : <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field title="Город / регион"><input className="field" required value={form.home_city} maxLength={100} onChange={(e)=>update("home_city",e.target.value)} placeholder="Нижний Новгород" /></Field>
            <Field title="Опыт, лет"><input className="field" type="number" min={0} max={60} value={form.experience_years??""} onChange={(e)=>update("experience_years",e.target.value?Number(e.target.value):null)}/></Field>
            <Field title="Тип акватории"><select className="field" value={form.activity_style} onChange={(e)=>update("activity_style",e.target.value)}>{["Пресноводная","Морская","Оба варианта"].map((v)=><option key={v}>{v}</option>)}</select></Field>
            <Field title="Формат выезда"><select className="field" value={form.access_type} onChange={(e)=>update("access_type",e.target.value)}>{["С берега","С лодки","Оба варианта"].map((v)=><option key={v}>{v}</option>)}</select></Field>
          </div>
          <Field title="Предпочитаемые водоёмы / тип воды"><textarea className="field min-h-20" value={form.preferred_waters} maxLength={600} onChange={(e)=>update("preferred_waters",e.target.value)} placeholder="Реки, озёра, водохранилища…" /></Field>
          <Field title="Моё снаряжение"><textarea className="field min-h-20" value={form.equipment_overview} maxLength={650} onChange={(e)=>update("equipment_overview",e.target.value)} placeholder="Общая информация о снаряжении, без точных мест погружений…" /></Field>
          <Field title="Кого ищу в напарники"><textarea className="field min-h-20" value={form.buddy_notes} maxLength={500} onChange={(e)=>update("buddy_notes",e.target.value)} placeholder="Совместные выезды, уровень опыта, транспорт, предпочтения…" /></Field>
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <label className="flex items-start gap-3 text-sm text-zinc-300">
              <input type="checkbox" className="mt-1 accent-lime-300" checked={form.safety_training_self_reported} onChange={(e)=>update("safety_training_self_reported",e.target.checked)} />
              <span>У меня есть подготовка по безопасности (со слов пользователя, не проверена)</span>
            </label>
            <p className="text-xs text-zinc-500">Для совместных выездов действует обязательный принцип наличия напарника.</p>
            <label className="flex items-start gap-3 text-sm text-zinc-200">
              <input type="checkbox" className="mt-1 accent-lime-300" checked={form.publicly_listed} onChange={(e)=>update("publicly_listed",e.target.checked)}/>
              <span>Показывать мою анкету другим пользователям</span>
            </label>
          </div>
          <button className="btn-primary" type="submit" disabled={working}><Save className="size-4"/>{working?"Сохраняем…":"Сохранить анкету"}</button>
        </form>}
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#151915] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">02 / Сообщество</p>
          <h2 className="mt-2 text-lg font-black">Участники рядом</h2>
          <p className="mt-2 text-xs text-zinc-400">Показываются только добровольно открытые анкеты. Для заявки на совместный выезд используй раздел «Напарники».</p>
          <div className="mt-4 space-y-3">
            {profiles.map((p)=><article key={p.user_id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold"><Waves className="size-4 text-[#D7FF35]"/>Участник сообщества</p>
              <p className="mt-2 text-xs text-zinc-400"><MapPin className="mr-1 inline size-3.5"/>{p.home_city||"Город не указан"} · {p.activity_style}</p>
              <p className="mt-2 text-xs text-zinc-300">{p.buddy_notes||"Открыт к совместной рыбалке"}</p>
              <p className="mt-2 text-[10px] text-zinc-500">{p.safety_training_self_reported?"Подготовка со слов пользователя":"Подготовка не указана"} · сведения не проверены</p>
            </article>)}
            {!profiles.length&&<div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">Пока нет открытых анкет. Ты можешь стать первым участником направления.</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151915] p-5">
          <h3 className="flex items-center gap-2 font-bold"><Compass className="size-4 text-[#D7FF35]"/>Свои достижения</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-400">В профиле открыта самостоятельная ветка «Подводная охота»: отчёты, фото и посещённые водоёмы. Без опасных заданий.</p>
          <Link to="/profile" className="btn-ghost mt-4 inline-flex">Открыть ачивки</Link>
        </div>
      </div>
    </section>}
  </Shell>;
}
