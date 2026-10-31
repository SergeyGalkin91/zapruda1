import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowUpRight, BrainCircuit, Compass, Crown, Fish, LockKeyhole, MapPin, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/analytics")({
  head:()=>({meta:[
    {title:"Аналитика места · Beta — ZAPRUDA"},
    {name:"description",content:"Приватная VIP-аналитика рыболовной точки и личного комплекта снастей."},
  ]}),
  validateSearch:(q:Record<string,unknown>)=>({mark:typeof q["mark"]==="string"?q["mark"]:""}),
  component:SpotAnalytics,
});

type Mark={id:string;kind:string;title:string;note:string;latitude:number;longitude:number};
type Kit={id:string;title:string;fishing_method:string;rod_id:string;reel_id:string;line_id:string|null;is_primary:boolean};
type Tackle={id:string;brand:string;model:string;variant:string};
type Analysis={
 headline:string;perspective:string;confidence:string;
 why:string[];tactics:string[];gear_fit:string;check_on_site:string[];limitations:string;
};
const kindNames:Record<string,string>={
 snag:"🪵 Коряга",riffle:"〰️ Перекат",dropoff:"↘️ Бровка",hole:"🔵 Яма",
 promising:"🎣 Перспективная точка",other:"📍 Другое",
};
const fishChoices=["Любой хищник","Щука","Судак","Окунь","Жерех","Голавль","Сом","Другая рыба"];
const timeChoices=["Время не указано","Утро","День","Вечер","Ночь"];

function SpotAnalytics(){
  const {mark:preferredMark}=Route.useSearch();
  const [loggedIn,setLoggedIn]=useState(false);
  const [loading,setLoading]=useState(true);
  const [access,setAccess]=useState<"vip"|"admin"|"locked">("locked");
  const [marks,setMarks]=useState<Mark[]>([]);
  const [kits,setKits]=useState<Kit[]>([]);
  const [tackle,setTackle]=useState<Tackle[]>([]);
  const [markId,setMarkId]=useState(preferredMark);
  const [kitId,setKitId]=useState("");
  const [fish,setFish]=useState("Любой хищник");
  const [dayTime,setDayTime]=useState("Время не указано");
  const [conditions,setConditions]=useState("");
  const [analyzing,setAnalyzing]=useState(false);
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    let active=true;
    void (async()=>{
      const {data:auth,error:authErr}=await supabase.auth.getUser();
      if(!active)return;
      if(authErr||!auth.user){setLoggedIn(false);setLoading(false);return;}
      setLoggedIn(true);
      const id=auth.user.id;
      const [vip,admin,markResult,kitResult,tackleResult]=await Promise.all([
        supabase.from("ai_memberships").select("active_until").eq("user_id",id).maybeSingle(),
        supabase.from("zapruda_admins").select("user_id").eq("user_id",id).maybeSingle(),
        supabase.from("private_fishing_marks").select("id,kind,title,note,latitude,longitude")
          .eq("user_id",id).order("created_at",{ascending:false}).limit(100),
        (supabase as any).from("angler_gear_sets").select("id,title,fishing_method,rod_id,reel_id,line_id,is_primary")
          .eq("user_id",id).order("created_at",{ascending:false}).limit(100),
        supabase.from("angler_gear").select("id,brand,model,variant").eq("user_id",id).limit(250),
      ]);
      if(!active)return;
      const vipOn=!!vip.data && new Date(vip.data.active_until).getTime()>Date.now();
      setAccess(admin.data?"admin":vipOn?"vip":"locked");
      const e=[vip.error,admin.error,markResult.error,kitResult.error,tackleResult.error].find(Boolean);
      if(e)setError("Не удалось загрузить настройки аналитики: "+e.message);
      const loadedMarks=(markResult.data??[]) as Mark[];
      const loadedKits=(kitResult.data??[]) as Kit[];
      setMarks(loadedMarks);setKits(loadedKits);setTackle((tackleResult.data??[]) as Tackle[]);
      setMarkId(current=>loadedMarks.some(m=>m.id===current)?current:loadedMarks[0]?.id??"");
      setKitId(current=>loadedKits.some(k=>k.id===current)?current:loadedKits.find(k=>k.is_primary)?.id??loadedKits[0]?.id??"");
      setLoading(false);
    })().catch(e=>{if(active){setLoading(false);setError(e instanceof Error?e.message:"Не удалось загрузить аналитику.");}});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{if(preferredMark && marks.some(m=>m.id===preferredMark))setMarkId(preferredMark);},[preferredMark,marks]);

  const selectedMark=marks.find(m=>m.id===markId);
  const selectedKit=kits.find(k=>k.id===kitId);
  const gearLabel=(id:string|null)=>{
    const item=tackle.find(t=>t.id===id);
    return item?[item.brand,item.model,item.variant].filter(Boolean).join(" "):"Не указано";
  };

  async function run(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(analyzing||access==="locked"||!selectedMark||!selectedKit)return;
    // Explicit confirmation: a single private spot goes to the AI model on request.
    if(!window.confirm("Передать ИИ координаты и заметку только выбранной точки «"+selectedMark.title+
      "», а также данные выбранного комплекта? Информация нужна для этого анализа и не публикуется в ZAPRUDA."))return;
    setAnalyzing(true);setAnalysis(null);setError("");setNotice("");
    const {data,resultError}=await (async()=>{
      const response=await supabase.functions.invoke("zapruda-spot-analytics",{body:{
        mark_id:selectedMark.id,kit_id:selectedKit.id,target_fish:fish,time_of_day:dayTime,conditions,
      }});
      if(!response.error)return{data:response.data,resultError:""};
      let message=response.error.message;
      const context=(response.error as unknown as {context?:Response}).context;
      if(context&&typeof context.json==="function"){
        try{const body=await context.json();if(typeof body?.error==="string")message=body.error;}catch{}
      }
      return{data:response.data,resultError:message};
    })().catch(e=>({data:null,resultError:e instanceof Error?e.message:"Не удалось подключиться к ИИ."}));
    setAnalyzing(false);
    if(resultError||data?.error){setError(resultError||data.error);return;}
    if(!data?.analysis){setError("Сервис не вернул анализ. Попробуй позднее.");return;}
    setAnalysis(data.analysis as Analysis);
    setNotice(typeof data.notice==="string"?data.notice:"Прогноз ориентировочный и не гарантирует клёв.");
  }

  return <Shell>
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#1C2918] via-[#121A12] to-[#0C110D] p-5 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">
          <Activity className="size-4"/> ZAPRUDA / VIP LAB / BETA
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Аналитика рыболовного места</h1>
          <span className="rounded-lg border border-[#D7FF35]/40 bg-[#D7FF35]/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#D7FF35]">Beta</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          Оцени свою сохранённую корягу, бровку, яму или перекат с учётом удилища, катушки, шнура и цели рыбалки.
          Один выбор места, один выбор комплекта, один запрос.
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">Данные точки доступны только владельцу. Анализ не подтверждает наличие рыбы и не заменяет карту глубин, прогноз погоды или разведку на месте.</p>
      </header>
      {loading&&<p className="text-sm text-zinc-400">Проверяем VIP-доступ и загружаем твои метки…</p>}
      {!loading&&!loggedIn&&<div className="rounded-2xl border border-white/10 bg-[#151915] p-5">
        <LockKeyhole className="size-6 text-[#D7FF35]"/><h2 className="mt-3 text-lg font-bold">Войди в ZAPRUDA</h2>
        <p className="mt-2 text-sm text-zinc-400">Для приватной аналитики необходим аккаунт с сохранёнными точками и комплектами.</p>
        <Link to="/auth" className="btn-primary mt-4 inline-flex">Войти в аккаунт</Link>
      </div>}
      {!loading&&loggedIn&&<>
        <div className={"flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 " +
          (access==="locked"?"border-amber-400/25 bg-amber-400/5":"border-[#D7FF35]/25 bg-[#D7FF35]/5")}>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              {access==="locked"?<LockKeyhole className="size-4 text-amber-200"/>:<Crown className="size-4 text-[#D7FF35]"/>}
              {access==="admin"?"Доступ администратора · Beta":access==="vip"?"VIP-доступ активен":"VIP-доступ необходим"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {access==="locked"
                ?"Функция работает только при активном VIP-статусе. Оплата и включение VIP пока не запущены."
                :"До 8 анализов за 24 часа. Каждый запрос использует только выбранную точку и комплект."}
            </p>
          </div>
          <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-[#D7FF35] hover:underline">Мой профиль <ArrowUpRight className="size-4"/></Link>
        </div>
        <form onSubmit={e=>void run(e)} className="space-y-5 rounded-3xl border border-white/10 bg-[#151A14] p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-xl font-black"><Compass className="size-5 text-[#D7FF35]"/> Подготовить анализ</h2>
          {error&&<p role="alert" className="rounded-xl border border-red-400/25 bg-red-950/20 p-3 text-sm text-red-200">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-zinc-300">Моя сохранённая точка
              <select className="field mt-1" value={markId} onChange={e=>{setMarkId(e.target.value);setAnalysis(null);}} disabled={!marks.length}>
                {!marks.length&&<option value="">Нет сохранённых меток</option>}
                {marks.map(m=><option key={m.id} value={m.id}>{kindNames[m.kind]??"📍 Точка"} · {m.title}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-zinc-300">Мой рыболовный комплект
              <select className="field mt-1" value={kitId} onChange={e=>{setKitId(e.target.value);setAnalysis(null);}} disabled={!kits.length}>
                {!kits.length&&<option value="">Нет сохранённых комплектов</option>}
                {kits.map(k=><option key={k.id} value={k.id}>{k.is_primary?"★ ":""}{k.title||gearLabel(k.rod_id)+" + "+gearLabel(k.reel_id)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-zinc-300">Целевая рыба
              <select className="field mt-1" value={fish} onChange={e=>setFish(e.target.value)}>
                {fishChoices.map(f=><option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-zinc-300">Когда собираешься ловить
              <select className="field mt-1" value={dayTime} onChange={e=>setDayTime(e.target.value)}>
                {timeChoices.map(v=><option key={v}>{v}</option>)}
              </select>
            </label>
          </div>
          {selectedMark&&<div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#D7FF35]"><MapPin className="size-4"/>{selectedMark.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{kindNames[selectedMark.kind]??"Сохранённая точка"} · координаты хранятся приватно</p>
            {selectedMark.note&&<p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{selectedMark.note}</p>}
            <a href={"https://yandex.ru/maps/?pt="+encodeURIComponent(selectedMark.longitude+","+selectedMark.latitude)+"&z=15"}
              target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D7FF35] hover:underline">
              Открыть мою точку на карте <ArrowUpRight className="size-3.5"/>
            </a>
            <p className="mt-1 text-[11px] text-zinc-500">При переходе координаты получит Яндекс. Без перехода сторонняя карта здесь не загружается.</p>
          </div>}
          {selectedKit&&<div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-white"><Fish className="size-4 text-[#D7FF35]"/> Комплект {selectedKit.title||""}</p>
            <p className="mt-2 text-xs text-zinc-300"><strong>Удилище:</strong> {gearLabel(selectedKit.rod_id)}</p>
            <p className="mt-1 text-xs text-zinc-300"><strong>Катушка:</strong> {gearLabel(selectedKit.reel_id)}</p>
            {selectedKit.line_id&&<p className="mt-1 text-xs text-zinc-300"><strong>Шнур:</strong> {gearLabel(selectedKit.line_id)}</p>}
            <Link to="/profile" className="mt-2 inline-flex text-xs font-semibold text-[#D7FF35] hover:underline">Управлять снастями в профиле →</Link>
          </div>}
          <label className="block text-xs font-bold text-zinc-300">Что знаешь о месте (необязательно)
            <textarea className="field mt-1 min-h-20" maxLength={400} value={conditions} onChange={e=>setConditions(e.target.value)}
              placeholder="Например: течение слабое, много коряг, уровень воды упал, глубина около 2 м…"/>
          </label>
          {(!marks.length||!kits.length)&&<p className="text-sm text-amber-200">
            {!marks.length?"Добавь в профиле хотя бы одну приватную метку. ":""}
            {!kits.length?"Собери хотя бы один комплект из удилища и катушки.":""}
            {" "}<Link to="/profile" className="underline">Перейти в профиль</Link>
          </p>}
          <p className="flex items-start gap-2 text-xs leading-5 text-zinc-400"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#D7FF35]"/>
            Координаты и характеристики снастей отправляются серверному ИИ только после твоего подтверждения. Анализ не публикуется в ленте и не сохраняется в истории.</p>
          <button type="submit" disabled={access==="locked"||analyzing||!markId||!kitId}
            className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-sm font-extrabold sm:w-auto">
            <Sparkles className="size-5"/> {analyzing?"ИИ анализирует…":"Проанализировать место и комплект"}
          </button>
        </form>
        {analysis&&<section aria-labelledby="spot-result" className="space-y-4 rounded-3xl border border-[#D7FF35]/35 bg-[#151D14] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.19em] text-[#D7FF35]">AI / АНАЛИТИЧЕСКИЙ ОТЧЁТ</p>
          <h2 id="spot-result" className="text-xl font-black">{analysis.headline||"Предварительный разбор точки"}</h2>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-lg border border-[#D7FF35]/30 px-3 py-2 text-[#D7FF35]">{analysis.perspective}</span>
            <span className="rounded-lg border border-white/15 px-3 py-2 text-zinc-300">Уверенность: {analysis.confidence}</span>
          </div>
          {([
            ["На чём основана оценка",analysis.why],
            ["Тактика ловли",analysis.tactics],
            ["Что проверить на месте",analysis.check_on_site],
          ] as const).map(([title,entries])=><div key={title} className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-extrabold text-[#D7FF35]">{title}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">
              {entries.map((item,i)=><li key={i}>{item}</li>)}
            </ul>
          </div>)}
          <div className="border-t border-white/10 pt-4">
            <h3 className="font-extrabold text-[#D7FF35]">Подбор комплекта</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{analysis.gear_fit}</p>
          </div>
          <div className="border-t border-white/10 pt-4">
            <h3 className="font-extrabold text-white">Что неизвестно</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{analysis.limitations}</p>
          </div>
          {notice&&<p role="status" className="rounded-xl border border-white/10 p-3 text-xs text-zinc-400">{notice}</p>}
        </section>}
      </>}
      <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500"><Waves className="mt-0.5 size-4 shrink-0"/>
        Бета-версия использует данные твоего профиля, а не прямой доступ к гидрологии или текущим картам глубин.
        Для обоснованного прогноза в будущем подключим реальные карты рельефа, уровень воды, погоду и отчёты о клёве.</p>
    </div>
  </Shell>;
}
