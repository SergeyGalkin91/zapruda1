import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect,useState,type FormEvent } from "react";
import { Shell } from "@/components/Shell";
import { ReactionBar } from "@/components/ReactionBar";
import { supabase } from "@/integrations/supabase/client";
export const Route=createFileRoute("/reports/$id")({component:ReportDetail,head:()=>({meta:[{title:"Обсуждение отчёта — ZAPRUDA"}]})});
type Report={id:string;user_id:string;title:string;body:string|null;location_name:string|null;created_at:string};
type Comment={id:string;user_id:string;body:string;created_at:string;profiles?:{username:string|null;display_name:string|null}|null};
function ReportDetail(){
 const {id}=Route.useParams();
 const [report,setReport]=useState<Report|null>(null),[userId,setUserId]=useState<string|null>(null),[comments,setComments]=useState<Comment[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[title,setTitle]=useState(""),[body,setBody]=useState("");
 async function load(){
  const [{data,error:e},{data:c,error:ce}]=await Promise.all([
   supabase.from("fishing_reports").select("id,user_id,title,body,location_name,created_at").eq("id",id).maybeSingle(),
   supabase.from("comments").select("id,user_id,body,created_at,profiles(username,display_name)").eq("report_id",id).order("created_at",{ascending:true}).limit(200)
  ]);
  if(e||ce)setError(e?.message||ce?.message||"Ошибка загрузки");
  setReport(data as Report|null);setComments(c??[]);
  if(data){setTitle(data.title);setBody(data.body??"")}
  setLoading(false);
 }
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUserId(data.user?.id??null)});void load();return()=>{active=false}},[id]);
 async function save(){
  if(!report||userId!==report.user_id||busy||!title.trim())return;
  setBusy(true);const {error:e}=await supabase.from("fishing_reports").update({title:title.trim(),body:body.trim()}).eq("id",id).eq("user_id",userId);
  setBusy(false);if(e)setError(e.message);else{setEditing(false);await load()}
 }
 async function send(e:FormEvent){
  e.preventDefault();if(busy||!draft.trim()||!userId)return;
  setBusy(true);const {error:ce}=await supabase.from("comments").insert({report_id:id,user_id:userId,body:draft.trim()});
  setBusy(false);if(ce)setError(ce.message);else{setDraft("");await load()}
 }
 return <Shell><main className="mx-auto max-w-3xl">
  <Link to="/" className="text-sm text-[#D7FF35]">← К ленте</Link>
  {loading?<p className="mt-6">Загружаем отчёт…</p>:!report?<p className="panel mt-6 p-5">Отчёт не найден или недоступен.</p>:<>
   <article className="mt-5 rounded-2xl border border-white/10 bg-[#151915] p-5 sm:p-7">
    <p className="text-xs text-zinc-500">{new Date(report.created_at).toLocaleString("ru-RU")} {report.location_name?" · "+report.location_name:""}</p>
    {editing?<div className="mt-4 grid gap-3"><input className="field" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} aria-label="Название отчёта"/><textarea className="field min-h-36" maxLength={10000} value={body} onChange={e=>setBody(e.target.value)} aria-label="Описание отчёта"/><div className="flex gap-2"><button className="btn-primary" disabled={busy||!title.trim()} onClick={()=>void save()}>Сохранить</button><button className="btn-ghost" onClick={()=>setEditing(false)}>Отмена</button></div></div>:<><h1 className="mt-2 text-2xl font-black">{report.title}</h1><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{report.body}</p></>}
    {userId===report.user_id&&!editing&&<button className="btn-ghost mt-4" type="button" onClick={()=>setEditing(true)}>Редактировать мой отчёт</button>}
    <div className="mt-5"><ReactionBar reportId={id}/></div>
   </article>
   <section className="mt-5 rounded-2xl border border-white/10 bg-[#151915] p-5 sm:p-7"><h2 className="text-xl font-bold">Обсуждение · {comments.length}</h2><p className="mt-1 text-sm text-zinc-400">Задавай вопросы автору и обсуждай рыбалку.</p>
    <div className="mt-5 space-y-3">{comments.map(c=><div key={c.id} className="rounded-xl bg-black/25 p-3"><p className="text-xs text-zinc-500"><strong className="mr-2 text-white">{c.profiles?.display_name||c.profiles?.username||(c.user_id===userId?"Вы":"Рыболов")}</strong>{new Date(c.created_at).toLocaleString("ru-RU")}{c.user_id===report.user_id?" · Автор отчёта":""}</p><p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p></div>)}</div>
    {userId?<form onSubmit={send} className="mt-5 flex flex-col gap-2"><textarea className="field min-h-20" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Напиши комментарий или вопрос…"/><button className="btn-primary self-start" disabled={busy||!draft.trim()}>Отправить</button></form>:<Link className="btn-ghost mt-4 inline-flex" to="/auth">Войди, чтобы комментировать</Link>}
   </section>
  </>}
  {error&&<p role="alert" className="mt-3 text-red-300">{error}</p>}
 </main></Shell>
}
