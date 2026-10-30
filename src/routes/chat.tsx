import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect,useState,type FormEvent } from "react";
import { Globe2,MapPin,Send } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
export const Route=createFileRoute("/chat")({component:ChatPage,head:()=>({meta:[{title:"Общий чат — ZAPRUDA"}]})});
type Place={id:string;name:string;level:string};
type Message={id:string;user_id:string;body:string;created_at:string;reply_to_id:string|null;profiles?:{username:string|null;display_name:string|null}|null};

const db=supabase as any;
function ChatPage(){
 const [me,setMe]=useState(""),[city,setCity]=useState(""),[region,setRegion]=useState(""),[countryCode,setCountryCode]=useState("RU"),[countryPlace,setCountryPlace]=useState<Place|null>(null),[regionPlace,setRegionPlace]=useState<Place|null>(null),[place,setPlace]=useState<Place|null>(null);
 const [scope,setScope]=useState<"country"|"region"|"city">("country");
 const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(""),[error,setError]=useState(""),[reply,setReply]=useState<Message|null>(null),[busy,setBusy]=useState(false);
 const [counts,setCounts]=useState<Record<string,{emoji:string;user_id:string}[]>>({});
 useEffect(()=>{let live=true;void (async()=>{
  const {data}=await supabase.auth.getUser();if(!live||!data.user)return;setMe(data.user.id);
  const [{data:a},{data:g}]=await Promise.all([
   supabase.from("angler_preferences").select("home_city,home_region,home_country_code").eq("user_id",data.user.id).maybeSingle(),
   supabase.from("guide_profiles").select("home_city").eq("user_id",data.user.id).maybeSingle()
  ]);
  const ownCity=(a?.home_city?.trim()||g?.home_city?.trim()||"");
  const ownRegion=a?.home_region?.trim()||"";
  const ownCountry=a?.home_country_code||"RU";
  if(live){setCity(ownCity);setRegion(ownRegion);setCountryCode(ownCountry)}
  const {data:places}=await db.from("chat_places").select("id,name,level,parent_id,country_code").eq("country_code",ownCountry).limit(1500);
  const country=(places??[]).find((p:any)=>p.level==="country");
  const regional=(places??[]).find((p:any)=>p.level==="region"&&p.name.toLowerCase()===ownRegion.toLowerCase());
  const cityPlace=(places??[]).find((p:any)=>p.level==="city"&&p.name.toLowerCase()===ownCity.toLowerCase()&&(!regional||p.parent_id===regional.id));
  if(live){setCountryPlace(country||null);setRegionPlace(regional||null);setPlace(cityPlace||null)}
 })();return()=>{live=false}},[]);
 const placeId=scope==="country"?countryPlace?.id:scope==="region"?regionPlace?.id:place?.id;
 useEffect(()=>{
  if(!me||!placeId){setMessages([]);return}
  let live=true;
  const load=async()=>{
   const {data,error:e}=await db.from("chat_messages").select("id,user_id,body,created_at,reply_to_id,profiles(username,display_name)").eq("place_id",placeId).eq("topic","general").order("created_at",{ascending:false}).limit(100);
   if(!live)return;
   if(e){setError(e.message);return}
   const list=((data??[]) as Message[]).reverse();setMessages(list);
   if(list.length){const {data:r}=await db.from("chat_message_reactions").select("message_id,user_id,emoji").in("message_id",list.map(m=>m.id));if(live){const next:Record<string,{emoji:string;user_id:string}[]>={};for(const x of r??[])(next[x.message_id]??=[]).push(x);setCounts(next)}}
   else setCounts({});
  };
  void load();const timer=window.setInterval(()=>{if(!document.hidden)void load()},10000);
  const channel=supabase.channel("simple-chat-"+placeId).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"place_id=eq."+placeId},()=>void load()).subscribe();
  return()=>{live=false;window.clearInterval(timer);void supabase.removeChannel(channel)};
 },[me,placeId]);
 async function send(e:FormEvent){e.preventDefault();if(!me||!placeId||!draft.trim()||busy)return;setBusy(true);setError("");
 const {error:x}=await db.from("chat_messages").insert({user_id:me,place_id:placeId,topic:"general",body:draft.trim(),reply_to_id:reply?.id??null});
 setBusy(false);if(x)setError(x.message);else{setDraft("");setReply(null);window.dispatchEvent(new Event("focus"))}}
 async function react(id:string,emoji:string){if(!me)return;const previous=(counts[id]??[]).find(x=>x.user_id===me);if(previous){const {error:e}=await db.from("chat_message_reactions").delete().eq("message_id",id).eq("user_id",me);if(e){setError(e.message);return}}if(previous?.emoji!==emoji){const {error:e}=await db.from("chat_message_reactions").insert({message_id:id,user_id:me,emoji});if(e){setError(e.message);return}}
 const {data}=await db.from("chat_message_reactions").select("message_id,user_id,emoji").eq("message_id",id);setCounts(prev=>({...prev,[id]:(data??[]).map((r:{emoji:string;user_id:string})=>r)}));}
 return <Shell><main className="mx-auto max-w-3xl">
 <p className="text-xs font-black uppercase tracking-[.2em] text-[#D7FF35]">ZAPRUDA / CHAT</p><h1 className="mt-2 text-3xl font-black">Общий чат</h1><p className="mt-2 text-sm text-zinc-400">Чаты страны, области и города из твоего профиля. Общий чат страны объединяет всех её рыболовов независимо от города.</p>
 <div className="mt-5 flex flex-wrap gap-2">
 <button type="button" className={scope==="country"?"btn-primary":"btn-ghost"} disabled={!countryPlace} onClick={()=>{setScope("country");setReply(null)}}><Globe2 className="inline size-4"/> Страна: {countryPlace?.name||countryCode}</button>
 <button type="button" className={scope==="region"?"btn-primary":"btn-ghost"} disabled={!regionPlace} onClick={()=>{setScope("region");setReply(null)}}><MapPin className="inline size-4"/> Область: {region||"Не указана"}</button>
 <button type="button" className={scope==="city"?"btn-primary":"btn-ghost"} disabled={!place} onClick={()=>{setScope("city");setReply(null)}}><MapPin className="inline size-4"/> Город: {city||"Не указан"}</button>
 </div>
 {(!regionPlace||!place)&&<p className="mt-3 text-sm text-zinc-400">Если область или город недоступны, <Link to="/profile" className="text-[#D7FF35] underline">проверь страну, регион и город в профиле</Link>. Чат страны уже доступен.</p>}
 <section className="mt-5 rounded-xl border border-white/10 bg-[#131813] p-4 sm:p-5"><h2 className="font-bold">{scope==="country"?(countryPlace?.name||"Страна"):scope==="region"?region:city}</h2><div className="mt-4 max-h-[65vh] min-h-72 space-y-3 overflow-y-auto">
 {messages.map(m=><article key={m.id} className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs font-bold text-[#D7FF35]">{m.user_id===me?"Вы":m.profiles?.display_name||m.profiles?.username||"Рыболов"} <span className="ml-2 font-normal text-zinc-500">{new Date(m.created_at).toLocaleString("ru-RU")}</span></p>{m.reply_to_id&&<p className="mt-2 border-l-2 border-[#D7FF35] pl-2 text-xs text-zinc-400">Ответ на сообщение</p>}<p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="text-xs text-zinc-400 underline" onClick={()=>setReply(m)}>Ответить</button>{["👍","❤️","🔥","😂"].map(emoji=><button type="button" key={emoji} onClick={()=>void react(m.id,emoji)} className={"rounded-md border px-2 py-1 text-xs "+((counts[m.id]??[]).some(x=>x.user_id===me&&x.emoji===emoji)?"border-[#D7FF35]":"border-white/10")}>{emoji} {(counts[m.id]??[]).filter(x=>x.emoji===emoji).length||""}</button>)}</div></article>)}
 {!messages.length&&<p className="text-sm text-zinc-500">Пока нет сообщений. Начни обсуждение.</p>}</div>
 {reply&&<div className="mt-4 flex items-center justify-between rounded-lg border-l-2 border-[#D7FF35] p-2 text-xs"><span>Ответ: {reply.body.slice(0,100)}</span><button onClick={()=>setReply(null)} className="underline">Отмена</button></div>}
 <form className="mt-4 flex gap-2" onSubmit={send}><input className="field min-w-0 flex-1" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Сообщение…"/><button className="btn-primary" disabled={busy||!me||!placeId||!draft.trim()}><Send className="size-4"/></button></form>
 {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section></main></Shell>;
}