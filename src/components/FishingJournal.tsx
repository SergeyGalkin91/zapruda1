import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
type Session = {id:string;started_at:string;active_seconds:number;status:string};
type Post = {session_id:string;author_id:string;title:string;description:string;visibility:string;created_at:string};
type Comment = {id:string;session_id:string;user_id:string;body:string;created_at:string};
type Reaction = {session_id:string;user_id:string;emoji:string};
const emojis=["👍","❤️","🔥","🎣","👏"];
export function FishingJournal({userId,finished}:{userId:string;finished:Session[]}){
 const [posts,setPosts]=useState<Post[]>([]);
 const [comments,setComments]=useState<Comment[]>([]);
 const [reactions,setReactions]=useState<Reaction[]>([]);
 const [selected,setSelected]=useState("");
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [visibility,setVisibility]=useState("private");
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
   const [p,c,r]=await Promise.all([
    (supabase as any).from("fishing_session_posts").select("session_id,author_id,title,description,visibility,created_at").order("created_at",{ascending:false}).limit(100),
    (supabase as any).from("fishing_session_comments").select("id,session_id,user_id,body,created_at").order("created_at",{ascending:true}).limit(400),
    (supabase as any).from("fishing_session_reactions").select("session_id,user_id,emoji").limit(1000)
   ]);
   if(p.error||c.error||r.error){setError(p.error?.message||c.error?.message||r.error?.message||"Ошибка загрузки журнала");return;}
   setPosts(p.data||[]);setComments(c.data||[]);setReactions(r.data||[]);setError("");
 },[]);
 useEffect(()=>{void load()},[load]);
 const editing=posts.find(p=>p.session_id===selected&&p.author_id===userId);
 const choose=(id:string)=>{
  const post=posts.find(p=>p.session_id===id&&p.author_id===userId);
  setSelected(id);setTitle(post?.title||"Моя рыбалка");setDescription(post?.description||"");setVisibility(post?.visibility||"private");setError("");setNotice("");
 };
 async function save(){
  if(!selected||!title.trim()||busy)return;
  setBusy(true);setError("");setNotice("");
  const payload={session_id:selected,author_id:userId,title:title.trim(),description:description.trim(),visibility};
  const result=editing
    ? await (supabase as any).from("fishing_session_posts").update({title:payload.title,description:payload.description,visibility,updated_at:new Date().toISOString()}).eq("session_id",selected).eq("author_id",userId)
    : await (supabase as any).from("fishing_session_posts").insert(payload);
  setBusy(false);
  if(result.error){setError(result.error.message);return;}
  setNotice("Запись сохранена.");setSelected("");await load();
 }
 async function remove(id:string){
  if(busy||!window.confirm("Удалить публикацию? Серверная сессия и время рыбалки сохранятся."))return;
  setBusy(true);const {error:e}=await (supabase as any).from("fishing_session_posts").delete().eq("session_id",id).eq("author_id",userId);
  setBusy(false);if(e){setError(e.message);return;}if(selected===id)setSelected("");await load();
 }
 async function react(id:string,emoji:string){
  if(busy)return;setBusy(true);setError("");
  const own=reactions.find(r=>r.session_id===id&&r.user_id===userId);
  const result=own?.emoji===emoji
   ? await (supabase as any).from("fishing_session_reactions").delete().eq("session_id",id).eq("user_id",userId)
   : await (supabase as any).from("fishing_session_reactions").upsert({session_id:id,user_id:userId,emoji},{onConflict:"session_id,user_id"});
  setBusy(false);if(result.error)setError(result.error.message);else await load();
 }
 async function comment(id:string){
  const body=(drafts[id]||"").trim();if(!body||busy)return;
  setBusy(true);const {error:e}=await (supabase as any).from("fishing_session_comments").insert({session_id:id,user_id:userId,body});
  setBusy(false);if(e)setError(e.message);else {setDrafts(d=>({...d,[id]:""}));await load();}
 }
 async function removeComment(id:string){
  if(busy||!window.confirm("Удалить свой комментарий?"))return;
  setBusy(true);setError("");
  const {error:e}=await (supabase as any).from("fishing_session_comments").delete().eq("id",id).eq("user_id",userId);
  setBusy(false);if(e)setError(e.message);else await load();
 }
 const unpublished=finished.filter(s=>!posts.some(p=>p.session_id===s.id));
 return <section className="mb-8 rounded-3xl border border-white/10 bg-[#151915] p-5 sm:p-7" id="fishing-journal">
  <h2 className="text-xl font-bold">Дневник рыбалок и реакции</h2>
  <p className="mt-2 text-sm text-zinc-400">Заверши рыбалку, затем нажми на её дату ниже и сохрани результат. Запись можно изменить или удалить. Для лайков, реакций и комментариев выбери видимость «Сообществу». GPS-маршрут пока хранится только в этом браузере и не публикуется.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  {notice&&<p role="status" className="mt-3 text-sm text-[#D7FF35]">{notice}</p>}
  <div className="mt-4 flex flex-wrap gap-2">
   {unpublished.map(s=><button key={s.id} type="button" className="btn-ghost text-xs" onClick={()=>choose(s.id)}>+ {new Date(s.started_at).toLocaleDateString("ru-RU")} · {Math.floor(s.active_seconds/60)} мин</button>)}
   {!unpublished.length&&<p className="text-xs text-zinc-500">Для новой записи сначала заверши рыбалку.</p>}
  </div>
  {selected&&<div className="mt-4 grid gap-3 rounded-2xl border border-[#D7FF35]/25 p-4">
    <h3 className="font-semibold">{editing?"Редактировать запись":"Сохранить результат рыбалки"}</h3>
    <input aria-label="Название рыбалки" className="field w-full" maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/>
    <textarea aria-label="Описание рыбалки" className="field min-h-24 w-full" maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Где ловил, что поймал, снасти, впечатления…"/>
    <label className="text-sm text-zinc-300">Видимость <select className="field ml-2" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Только мне</option><option value="public">Сообществу</option></select></label>
    <div className="flex gap-2"><button type="button" className="btn-primary" disabled={busy||!title.trim()} onClick={()=>void save()}>Сохранить</button><button type="button" className="btn-ghost" onClick={()=>setSelected("")}>Отмена</button></div>
   </div>}
  <div className="mt-5 grid gap-4">{posts.map(p=>{
    const own=p.author_id===userId;
    const rs=reactions.filter(r=>r.session_id===p.session_id);
    const cs=comments.filter(c=>c.session_id===p.session_id);
    return <article key={p.session_id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
     <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{p.title}</h3><p className="mt-1 text-xs text-zinc-500">{new Date(p.created_at).toLocaleString("ru-RU")} · {p.visibility==="private"?"Только мне":"Публичная запись"}</p></div>{own&&<div className="flex gap-2"><button className="text-xs text-[#D7FF35]" onClick={()=>choose(p.session_id)}>Изменить</button><button className="text-xs text-red-300" onClick={()=>void remove(p.session_id)}>Удалить</button></div>}</div>
     {p.description&&<p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{p.description}</p>}
     {p.visibility==="public"&&<><div className="mt-3 flex flex-wrap gap-2">{emojis.map(e=><button key={e} type="button" aria-label={"Реакция "+e} disabled={busy} className={"rounded-lg border px-2 py-1 text-sm "+(rs.some(r=>r.emoji===e&&r.user_id===userId)?"border-[#D7FF35]":"border-white/10")} onClick={()=>void react(p.session_id,e)}>{e} {rs.filter(r=>r.emoji===e).length||""}</button>)}</div>
      <div className="mt-4 space-y-2">{cs.map(c=><p key={c.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">{c.body} {c.user_id===userId&&<button type="button" disabled={busy} className="ml-2 text-red-300 underline" onClick={()=>void removeComment(c.id)}>Удалить</button>}</p>)}</div>
      <div className="mt-3 flex gap-2"><input aria-label="Комментарий" maxLength={500} className="field min-w-0 flex-1" placeholder="Написать комментарий" value={drafts[p.session_id]||""} onChange={e=>setDrafts(d=>({...d,[p.session_id]:e.target.value}))}/><button className="btn-ghost" disabled={busy||!(drafts[p.session_id]||"").trim()} onClick={()=>void comment(p.session_id)}>Отправить</button></div>
     </>}
    </article>;
   })}</div>
 </section>;
}
