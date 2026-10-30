import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Ship, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Guide={user_id:string;title:string;home_city:string;specialties:string;boat_model:string;live_sonar_system:string;live_sonar_model:string;service_program:string};
export function VerifiedGuideDirectory(){
  const [guides,setGuides]=useState<Guide[]>([]);
  const [onlyLiveSonar,setOnlyLiveSonar]=useState(true);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    void (async()=>{
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user){if(active)setLoading(false);return;}
      // Public profile listing is filtered by RLS: active guides with trusted verification only.
      const {data,error:e}=await (supabase as any).from("guide_profiles")
        .select("user_id,title,home_city,specialties,boat_model,live_sonar_system,live_sonar_model,service_program")
        .eq("is_active",true).limit(80);
      if(!active)return;
      if(e)setError("Не удалось загрузить проверенных гидов: "+e.message);
      else setGuides((data??[]) as Guide[]);
      setLoading(false);
    })();
    return()=>{active=false;};
  },[]);
  const visible=guides.filter(g=>!onlyLiveSonar||g.live_sonar_system!=="Нет");
  return <section className="mt-6 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
    <p className="text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / ВЫЕЗДЫ С ГИДОМ</p>
    <h2 className="mt-2 flex items-center gap-2 text-xl font-black"><BadgeCheck className="size-6 text-[#D7FF35]"/> Проверенные гиды</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-400">Поиск гидов для рыбалки с лодки и живым сканированием, включая Panoptix и LiveScope. До подтверждения документов анкета не попадает в список.</p>
    <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" checked={onlyLiveSonar} onChange={e=>setOnlyLiveSonar(e.target.checked)} className="accent-[#D7FF35]" />
      Только с Panoptix / LiveScope / аналогами
    </label>
    {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {loading&&<p className="mt-3 text-sm text-zinc-400">Проверяем гидов…</p>}
    {!loading&&!visible.length&&<p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-zinc-400">
      Пока нет подходящих подтверждённых гидов. Можно вернуться позднее или убрать фильтр оборудования.
    </p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {visible.map(g=><article key={g.user_id} className="rounded-2xl border border-white/10 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-[#D7FF35]"><BadgeCheck className="size-4"/> Проверенный гид ZAPRUDA</p>
        <h3 className="mt-2 font-black text-white">{g.title}</h3>
        <p className="mt-1 text-xs text-zinc-400">{g.home_city} · {g.specialties}</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-zinc-300"><Ship className="size-4 text-[#D7FF35]"/> {g.boat_model||"Лодка не указана"}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-zinc-300"><Waves className="size-4 text-[#D7FF35]"/> {g.live_sonar_system==="Нет"?"Без живого сканирования":g.live_sonar_system+" "+g.live_sonar_model}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-400">{g.service_program}</p>
        <Link to="/messages" search={{mark:"",to:g.user_id}} className="btn-primary mt-4 inline-flex">
          Запросить переписку с гидом
        </Link>
      </article>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-zinc-500">Знак означает, что заявку рассмотрел администратор ZAPRUDA; он не гарантирует отсутствие рисков или достоверность всех характеристик. Обсуждай цену, условия и безопасность до выезда.</p>
  </section>;
}
