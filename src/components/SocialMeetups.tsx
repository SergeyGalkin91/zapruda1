import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { MapPin, Plus, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Post = { id:string;owner_id:string;country_code:string;region_code:string;city_code:string;title:string;description:string;status:string };
type Member = { post_id:string;user_id:string;role:string;status:string };
type Message = {id:string;sender_id:string;body:string;created_at:string};
const db = supabase as any;

export function SocialMeetups(){
 const [userId,setUserId]=useState("");
 const [posts,setPosts]=useState<Post[]>([]);
 const [occupancy,setOccupancy]=useState<Record<string,number>>({});
 const [members,setMembers]=useState<Member[]>([]);
 const [country,setCountry]=useState("");
 const [region,setRegion]=useState("");
 const [city,setCity]=useState("");
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [active,setActive]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [privatePlace,setPrivatePlace]=useState("");
 const [meetingAt,setMeetingAt]=useState("");
 const [detailsReady,setDetailsReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const latestRequest=useRef(0);
 const refresh=useCallback(async()=>{
   const request=++latestRequest.current;
   const {data:auth}=await supabase.auth.getUser();
   if(request!==latestRequest.current)return;
   const uid=auth.user?.id??"";setUserId(uid);
   if(!uid){setPosts([]);setMembers([]);return;}
   if(!country.trim()||!region.trim()||!city.trim()){setPosts([]);setMembers([]);setOccupancy({});return;}
   const [p,m]=await Promise.all([
     db.from("meetup_posts").select("id,owner_id,country_code,region_code,city_code,title,description,status").eq("country_code",country.trim().toUpperCase()).eq("region_code",region.trim()).eq("city_code",city.trim()).order("created_at",{ascending:false}).limit(100),
     db.from("meetup_members").select("post_id,user_id,role,status")
   ]);
   if(request!==latestRequest.current)return;
   if(p.error||m.error){setError("СХОДКИ пока недоступны: "+(p.error?.message||m.error?.message));return;}
   setPosts(p.data??[]);setMembers(m.data??[]);
   const counts=await Promise.all((p.data??[]).map(async (post:Post)=>({id:post.id, result:await db.rpc("meetup_occupancy",{p_post:post.id})})));
   if(request!==latestRequest.current)return;
   const failed=counts.find(x=>x.result.error);
   if(failed){setError("Не удалось определить свободные места. Повторите загрузку.");setOccupancy({});return;}
   setOccupancy(Object.fromEntries(counts.map(x=>[x.id,Number(x.result.data??0)])));
 },[country,region,city]);
 useEffect(()=>{void refresh()},[refresh]);
 const membership=(id:string)=>members.find(m=>m.post_id===id&&m.user_id===userId);
 const accepted=(id:string)=>membership(id)?.status==="accepted";
 async function create(e:FormEvent){
   e.preventDefault();if(!userId||busy)return;
   setBusy(true);setError("");setNotice("");
   const {error:err}=await db.from("meetup_posts").insert({
     owner_id:userId,country_code:country.trim().toUpperCase(),region_code:region.trim(),
     city_code:city.trim(),title:title.trim(),description:description.trim()
   });
   setBusy(false);
   if(err){setError(err.message);return;}
   setTitle("");setDescription("");setNotice("Объявление опубликовано");await refresh();
 }
 async function join(id:string){
   if(!userId||busy)return;
   setBusy(true);setError("");
   const {error:err}=await db.from("meetup_members").insert({post_id:id,user_id:userId,role:"participant",status:"pending"});
   setBusy(false);
   if(err)setError(err.message);
   else {setNotice("Отклик отправлен организатору");await refresh();}
 }
 async function decide(id:string,user:string,status:"accepted"|"declined"){
   setBusy(true);setError("");
   const {error:err}=await db.from("meetup_members").update({status}).eq("post_id",id).eq("user_id",user);
   setBusy(false);if(err)setError(err.message);else await refresh();
 }
 async function saveDetails(e:FormEvent){
   e.preventDefault();if(!active||!accepted(active)||posts.find(p=>p.id===active)?.owner_id!==userId||busy)return;
   setBusy(true);setError("");
   const {error:err}=await db.from("meetup_private_details").upsert({post_id:active,owner_id:userId,private_place:privatePlace.trim()||null,meeting_at:meetingAt?new Date(meetingAt).toISOString():null},{onConflict:"post_id"});
   setBusy(false);if(err){setError("Не удалось сохранить приватные детали: "+err.message);return;}
   setNotice("Приватные детали сохранены");await openChat(active);
 }
 async function openChat(id:string){
   if(!accepted(id)){setError("Чат доступен только принятым участникам");return;}
   setDetailsReady(false);
   const {data:details,error:detailsError}=await db.from("meetup_private_details").select("private_place,meeting_at").eq("post_id",id).maybeSingle();
   if(detailsError){setError("Ошибка доступа к месту встречи: "+detailsError.message);return;}
   setPrivatePlace(details?.private_place??"");setMeetingAt(details?.meeting_at?new Date(details.meeting_at).toISOString().slice(0,16):"");
   setDetailsReady(true);
   const {data,error:err}=await db.from("meetup_messages").select("id,sender_id,body,created_at").eq("post_id",id).order("created_at",{ascending:true}).limit(100);
   if(err){setError(err.message);return;}
   if(!accepted(id))return;
   setMessages(data??[]);setActive(id);
 }
 async function send(e:FormEvent){
   e.preventDefault();if(!draft.trim()||!accepted(active)||busy)return;
   setBusy(true);
   const {error:err}=await db.from("meetup_messages").insert({post_id:active,sender_id:userId,body:draft.trim()});
   setBusy(false);if(err){setError(err.message);return;}
   setDraft("");await openChat(active);
 }
 const shown=posts.filter(p=>(!country||p.country_code===country.trim().toUpperCase())&&(!region||p.region_code===region.trim())&&(!city||p.city_code===city.trim()));
 return <section className="z-underground mt-6 space-y-4 p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div><p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">Комьюнити · v0.7.1</p>
      <h2 className="mt-1 text-2xl font-black text-white">СХОДКИ</h2>
      <p className="text-sm text-zinc-400">Ищите своих в городе. До трёх участников. Точное место — только после принятия.</p></div>
    <Users className="text-[#D7FF35]" aria-hidden="true"/>
  </div>
  {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
  {notice&&<p role="status" className="text-sm text-[#D7FF35]">{notice}</p>}
  {!userId&&<p className="text-sm text-zinc-300">Войдите, чтобы создавать объявления и откликаться.</p>}
  <div className="grid gap-2 sm:grid-cols-3">
   <label className="text-xs text-zinc-300">Страна (код)<input value={country} maxLength={3} onChange={e=>setCountry(e.target.value)} placeholder="RU" className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"/></label>
   <label className="text-xs text-zinc-300">Регион<input value={region} onChange={e=>setRegion(e.target.value)} placeholder="Московская область" className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"/></label>
   <label className="text-xs text-zinc-300">Город<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Москва" className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"/></label>
  </div>
  {userId&&<form onSubmit={create} className="grid gap-3 rounded-xl border border-[#D7FF35]/25 p-3">
    <h3 className="font-bold">+ Создать объявление</h3>
    <input required minLength={4} maxLength={100} placeholder="Заголовок сходки" value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/40 p-3"/>
    <textarea maxLength={1500} placeholder="Что планируете ловить?" value={description} onChange={e=>setDescription(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/40 p-3"/>
    <button disabled={busy||!country||!region||!city} className="btn-primary inline-flex items-center justify-center gap-2"><Plus size={16}/> Опубликовать</button>
  </form>}
  {(!country.trim()||!region.trim()||!city.trim())&&<p className="text-sm text-zinc-400">Укажите страну, регион и город, чтобы увидеть местные объявления.</p>}
  <div className="grid gap-3 md:grid-cols-2">{shown.map(p=>{
    const count=occupancy[p.id];
    const mine=membership(p.id),owner=p.owner_id===userId;
    return <article key={p.id} className="rounded-xl border border-white/15 bg-black/20 p-4">
      <div className="flex justify-between gap-2"><h3 className="font-bold text-white">{p.title}</h3><span className="text-[#D7FF35]">{count===undefined?"—":count}/3</span></div>
      <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400"><MapPin size={13}/>{p.country_code} · {p.region_code} · {p.city_code}</p>
      <p className="mt-2 text-sm text-zinc-300">{p.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
       {!owner&&!mine&&userId&&p.status==="open"&&count!==undefined&&count<3&&<button disabled={busy} onClick={()=>void join(p.id)} className="btn-primary">Откликнуться</button>}
       {mine?.status==="pending"&&<span className="text-xs text-zinc-400">Отклик ожидает решения</span>}
       {accepted(p.id)&&<button onClick={()=>void openChat(p.id)} className="btn-ghost inline-flex items-center gap-2"><MessageCircle size={15}/> Частный чат</button>}
      </div>
      {owner&&members.filter(m=>m.post_id===p.id&&m.status==="pending").map(m=><div key={m.user_id} className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-xs">
       <span>Заявка: {m.user_id.slice(0,8)}…</span>
       <button disabled={busy||count===undefined||count>=3} onClick={()=>void decide(p.id,m.user_id,"accepted")} className="text-[#D7FF35]">Принять</button>
       <button disabled={busy} onClick={()=>void decide(p.id,m.user_id,"declined")} className="text-red-300">Отклонить</button>
      </div>)}
    </article>
   })}</div>
  {active&&accepted(active)&&<form onSubmit={send} className="space-y-3 rounded-xl border border-[#D7FF35]/30 p-4">
   <h3 className="font-bold">Приватный чат сходки</h3>
   {detailsReady&&<div className="space-y-2 rounded-lg border border-white/10 p-3 text-sm"><p className="text-[#D7FF35]">Место и время доступны только принятым участникам</p><p>{privatePlace||"Место уточняется"}</p><p>{meetingAt?new Date(meetingAt).toLocaleString("ru-RU"):"Время уточняется"}</p></div>}
   <div className="max-h-64 space-y-2 overflow-y-auto">{messages.map(m=><p key={m.id} className="text-sm text-zinc-200">{m.sender_id===userId?"Вы":"Участник"}: {m.body}</p>)}</div>
   <div className="flex gap-2"><input required maxLength={1500} value={draft} onChange={e=>setDraft(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 p-3" placeholder="Сообщение"/><button disabled={busy} className="btn-primary">Отправить</button></div>
  </form>}
  {active&&accepted(active)&&posts.find(p=>p.id===active)?.owner_id===userId&&<form onSubmit={saveDetails} className="space-y-2 rounded-xl border border-white/10 p-4"><h3 className="font-bold">Приватные детали для участников</h3><input maxLength={500} value={privatePlace} onChange={e=>setPrivatePlace(e.target.value)} placeholder="Точное место встречи" className="w-full rounded-lg border border-white/20 bg-black/40 p-3"/><input type="datetime-local" value={meetingAt} onChange={e=>setMeetingAt(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/40 p-3"/><button disabled={busy} className="btn-primary">Сохранить место и время</button></form>}
 </section>
}
