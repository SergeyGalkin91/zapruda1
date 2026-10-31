import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, MessageCircle, Plus, Send, UserPlus, Users, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Group = { id:string;name:string;description:string;city:string;country:string;interests:string;owner_id:string };
type Member = { group_id:string;user_id:string;role:string;status:"pending"|"accepted"|"declined";invited_by:string|null };
type Person = { id:string;username:string|null;display_name:string|null };
type Request = {id:string;name:string;city:string;status:"awaiting_payment"|"paid"|"cancelled";fee_rub:number;created_at:string };
type GroupMessage = {id:string;user_id:string;body:string;created_at:string};
const db=supabase as any;
const display=(p?:Person)=>p?.display_name||p?.username||"Рыболов";

export function SocialGroups(){
  const [uid,setUid]=useState("");
  const [groups,setGroups]=useState<Group[]>([]);
  const [cityFilter,setCityFilter]=useState("");
  const [selectedPublicClub,setSelectedPublicClub]=useState("");
  const [publicReports,setPublicReports]=useState<{id:string;title:string;user_id:string;photo?:string}[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [requests,setRequests]=useState<Request[]>([]);
  const [newName,setNewName]=useState("");
  const [city,setCity]=useState("");
  const [description,setDescription]=useState("");
  const [editingGroup,setEditingGroup]=useState("");
  const [editName,setEditName]=useState("");
  const [editCountry,setEditCountry]=useState("Россия");
  const [editCity,setEditCity]=useState("");
  const [editDescription,setEditDescription]=useState("");
  const [editInterests,setEditInterests]=useState("");
  const [groupId,setGroupId]=useState("");
  const [inviteId,setInviteId]=useState("");
  const [activeGroup,setActiveGroup]=useState("");
  const [messages,setMessages]=useState<GroupMessage[]>([]);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const refresh=useCallback(async()=>{
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){setUid("");return;}
    const id=auth.user.id;setUid(id);
    const [g,m,p,q]=await Promise.all([
      db.from("social_groups").select("id,name,description,city,country,interests,owner_id").order("created_at",{ascending:false}).limit(200),
      db.from("social_group_members").select("group_id,user_id,role,status,invited_by"),
      supabase.from("profiles").select("id,username,display_name").neq("id",id).limit(250),
      db.from("club_creation_requests").select("id,name,city,status,fee_rub,created_at").eq("applicant_id",id).order("created_at",{ascending:false}).limit(30),
    ]);
    const e=[g.error,m.error,p.error,q.error].find(Boolean);
    if(e)setError("Ошибка загрузки клуба: "+e.message);else setError("");
    setGroups((g.data??[]) as Group[]);
    setMembers((m.data??[]) as Member[]);
    setPeople((p.data??[]) as Person[]);
    setRequests((q.data??[]) as Request[]);
  },[]);

  const loadMessages=useCallback(async(id:string)=>{
    if(!id)return;
    const {data,error:e}=await db.from("social_group_messages")
      .select("id,user_id,body,created_at").eq("group_id",id).order("created_at",{ascending:false}).limit(120);
    if(e)setError("Не удалось прочитать закрытый клубный чат: "+e.message);
    else setMessages(((data??[]) as GroupMessage[]).reverse());
  },[]);

  useEffect(()=>{
    void refresh();
    const interval=window.setInterval(()=>{if(!document.hidden)void refresh()},15000);
    const channel=supabase.channel("social-community-invitations")
      .on("postgres_changes",{event:"*",schema:"public",table:"social_group_members"},()=>void refresh())
      .subscribe();
    const focus=()=>void refresh();
    window.addEventListener("focus",focus);
    return()=>{window.clearInterval(interval);window.removeEventListener("focus",focus);void supabase.removeChannel(channel);};
  },[refresh]);
  useEffect(()=>{
    if(!activeGroup){setMessages([]);return;}
    void loadMessages(activeGroup);
    const channel=supabase.channel("zapruda-club-chat-"+activeGroup)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"social_group_messages",filter:"group_id=eq."+activeGroup},
        ()=>void loadMessages(activeGroup)).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[activeGroup,loadMessages]);

  async function requestClub(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!uid||busy||newName.trim().length<3)return;
    setBusy(true);setError("");setNotice("");
    const {error:insertError}=await db.from("club_creation_requests").insert({
      applicant_id:uid,name:newName.trim(),city:city.trim(),description:description.trim(),
    });
    setBusy(false);
    if(insertError){setError("Не удалось создать заявку: "+insertError.message);return;}
    setNewName("");setCity("");setDescription("");
    setNotice("Заявка сохранена. Оплата 500 ₽ ещё не принимается: нужен подключённый платёжный сервис. Клуб появится только после подтверждения платежа.");
    await refresh();
  }

  async function activateClub(request:Request){
    if(busy||request.status!=="paid")return;
    setBusy(true);setError("");
    const {data,error:rpcError}=await db.rpc("activate_paid_club",{p_request_id:request.id});
    setBusy(false);
    if(rpcError){setError("Не удалось открыть оплаченный клуб: "+rpcError.message);return;}
    setNotice("Клуб создан. Теперь можно приглашать участников и общаться в своём закрытом чате.");
    setActiveGroup(data);setGroupId(data);
    await refresh();
  }

  async function invite(){
    if(!uid||!groupId||!inviteId||busy)return;
    if(groups.find(g=>g.id===groupId)?.owner_id!==uid){setError("Приглашать может только владелец клуба.");return;}
    setBusy(true);setError("");setNotice("");
    const {error:e}=await db.from("social_group_members").insert({
      group_id:groupId,user_id:inviteId,role:"member",status:"pending",invited_by:uid,
    });
    setBusy(false);
    if(e)setError("Не удалось отправить приглашение: "+e.message);
    else{setInviteId("");setNotice("Приглашение отправлено, участник должен принять его.");await refresh();}
  }

  async function respond(member:Member,status:"accepted"|"declined"){
    if(busy||member.user_id!==uid)return;
    setBusy(true);setError("");
    const {error:e}=await db.from("social_group_members").update({status})
      .eq("group_id",member.group_id).eq("user_id",uid);
    setBusy(false);
    if(e)setError("Не удалось обработать приглашение: "+e.message);
    else{setNotice(status==="accepted"?"Ты вступил в клуб. Открой его чат.":"Приглашение отклонено.");await refresh();}
  }

  async function send(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!activeGroup||!uid||!draft.trim()||busy)return;
    setBusy(true);setError("");
    const {error:sendError}=await db.from("social_group_messages").insert({
      group_id:activeGroup,user_id:uid,body:draft.trim(),
    });
    setBusy(false);
    if(sendError){setError("Сообщение не отправлено: "+sendError.message);return;}
    setDraft("");await loadMessages(activeGroup);
  }

  function beginEdit(g:Group){setEditingGroup(g.id);setEditName(g.name);setEditCountry(g.country||"Россия");setEditCity(g.city);setEditDescription(g.description);setEditInterests(g.interests||"");}
  async function saveGroup(){
    if(!uid||busy||!editName.trim()||!editCountry.trim()||!editCity.trim())return;
    setBusy(true);setError("");
    const {error:e}=await db.from("social_groups").update({name:editName.trim(),country:editCountry.trim(),city:editCity.trim(),description:editDescription.trim(),interests:editInterests.trim()}).eq("id",editingGroup).eq("owner_id",uid);
    setBusy(false);
    if(e)setError("Клуб не сохранён: "+e.message);else{setEditingGroup("");setNotice("Информация клуба обновлена.");await refresh();}
  }
  async function openPublicClub(groupId:string){
    if(selectedPublicClub===groupId){setSelectedPublicClub("");return}
    setSelectedPublicClub(groupId);setPublicReports([]);
    const memberIds=members.filter(m=>m.group_id===groupId&&m.status==="accepted").map(m=>m.user_id);
    if(!memberIds.length)return;
    const {data,error:e}=await supabase.from("fishing_reports").select("id,title,user_id").eq("is_public",true).in("user_id",memberIds).order("created_at",{ascending:false}).limit(12);
    if(e)setError("Не удалось загрузить публичные отчёты: "+e.message);
    else {
      const rows=(data??[]) as {id:string;title:string;user_id:string;photo?:string}[];
      if(rows.length){
        const {data:photos}=await supabase.from("report_photos").select("report_id,storage_path,sort_order").in("report_id",rows.map(r=>r.id)).order("sort_order",{ascending:true});
        const first=new Map<string,string>();
        for(const p of photos??[])if(!first.has(p.report_id))first.set(p.report_id,p.storage_path);
        const paths=[...first.values()];
        if(paths.length){const {data:urls}=await supabase.storage.from("report-photos").createSignedUrls(paths,1800);const byPath=new Map(paths.map((p,i)=>[p,urls?.[i]?.signedUrl||""]));for(const row of rows){const path=first.get(row.id);if(path)row.photo=byPath.get(path)}}
      }
      setPublicReports(rows);
    }
  }
  const own=groups.filter(g=>g.owner_id===uid);
  const joined=groups.filter(g=>members.some(m=>m.group_id===g.id&&m.user_id===uid&&m.status==="accepted"));
  const pending=members.filter(m=>m.user_id===uid&&m.status==="pending");

  return <section className="mt-6 rounded-3xl border border-[#D7FF35]/20 bg-[#151915] p-5 sm:p-7">
    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / КЛУБЫ</p>
    <h2 className="mt-2 flex items-center gap-2 text-xl font-black"><Users className="size-6 text-[#D7FF35]"/> Свои клубы и закрытые чаты</h2>
    <p className="mt-2 text-sm text-zinc-400">Создавай маленькую команду рыбаков, приглашай друзей, планируй совместный стритфишинг или обсуждай выезд с проверенным гидом на лодке с Panoptix.</p>
    <div className="mt-5 rounded-xl border border-[#D7FF35]/20 bg-black/20 p-4">
      <h3 className="text-base font-black">Каталог клубов</h3>
      <p className="mt-1 text-xs text-zinc-400">Поиск по городу. Ранг рассчитывается по числу участников; спортивные достижения пока не подтверждены.</p>
      <input className="field mt-3 w-full" aria-label="Фильтр клубов по городу" placeholder="Город клуба, например Нижний Новгород" value={cityFilter} onChange={e=>setCityFilter(e.target.value)}/>
      <div className="mt-3 space-y-2">
      {groups.filter(g=>g.city.toLocaleLowerCase("ru").includes(cityFilter.trim().toLocaleLowerCase("ru"))).map(g=>{
        const n=members.filter(m=>m.group_id===g.id&&m.status==="accepted").length;
        const rank=n>=15?"Большая команда":n>=7?"Активный клуб":"Молодой клуб";
        return <div key={"public-"+g.id} className="rounded-lg border border-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{g.name}</strong><span className="text-xs text-[#D7FF35]">{rank}</span></div>
          <p className="mt-1 text-xs text-zinc-400">{g.country} · {g.city} · {n}/20 участников</p>
          {g.interests&&<p className="mt-2 text-sm">Интересы: {g.interests}</p>}
          {g.description&&<p className="mt-1 text-sm text-zinc-300">{g.description}</p>}
          <button type="button" className="mt-2 text-xs font-bold text-[#D7FF35] underline" onClick={()=>void openPublicClub(g.id)}>{selectedPublicClub===g.id?"Скрыть отчёты":"Публичные отчёты участников"}</button>
          {selectedPublicClub===g.id&&<div className="mt-2 space-y-1">{publicReports.length?publicReports.map(r=><Link key={r.id} to="/" className="block rounded-lg border border-white/10 p-2 text-xs hover:border-[#D7FF35]/30">{r.photo&&<img src={r.photo} alt="" loading="lazy" className="mb-2 aspect-[16/9] w-full rounded-md object-cover"/>}{r.title} · открыть в ленте</Link>):<p className="text-xs text-zinc-500">Публичных отчётов пока нет.</p>}</div>}
        </div>;
      })}
      {!groups.some(g=>g.city.toLocaleLowerCase("ru").includes(cityFilter.trim().toLocaleLowerCase("ru")))&&<p className="text-sm text-zinc-500">Клубов в этом городе пока нет.</p>}
      </div>
    </div>
    {error&&<p role="alert" className="my-3 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="my-3 rounded-xl border border-[#D7FF35]/30 p-3 text-sm text-[#D7FF35]">{notice}</p>}
    {!uid?<p className="mt-4 text-sm text-zinc-400">Чтобы участвовать в клубах, <Link to="/auth" className="font-semibold text-[#D7FF35] underline">войти в аккаунт</Link>.</p>:
    <div className="mt-5 grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <h3 className="mb-3 font-bold">Мои клубы ({joined.length})</h3>
          {joined.map(g=><button type="button" key={g.id} onClick={()=>setActiveGroup(g.id)}
            className={"mb-2 block w-full rounded-xl border p-3 text-left text-sm "+(activeGroup===g.id?"border-[#D7FF35]/60 bg-[#D7FF35]/10":"border-white/10 bg-black/10 hover:border-[#D7FF35]/40")}>
            <strong className="block text-white">{g.name}</strong><span className="mt-1 block text-xs text-zinc-400">{g.city||"Любой город"} · {g.description||"Общение и выезды"}</span>
            <span className="mt-2 flex items-center gap-2 text-xs text-[#D7FF35]"><MessageCircle className="size-3.5"/> Открыть чат {g.owner_id===uid?"· мой клуб":""}</span>
          </button>)}
          {own.map(g=><div key={"edit-"+g.id} className="mb-3 rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{g.name}</span><button type="button" className="btn-ghost text-xs" onClick={()=>beginEdit(g)}>Редактировать клуб</button></div>
            <p className="mt-1 text-xs text-zinc-400">{members.filter(m=>m.group_id===g.id&&m.status==="accepted").length} / 20 участников</p>
            {editingGroup===g.id&&<div className="mt-3 grid gap-2">
              <input className="field" maxLength={100} aria-label="Название клуба" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Название клуба"/>
              <input className="field" maxLength={100} aria-label="Страна" value={editCountry} onChange={e=>setEditCountry(e.target.value)} placeholder="Страна"/>
              <input className="field" maxLength={100} aria-label="Город" value={editCity} onChange={e=>setEditCity(e.target.value)} placeholder="Город"/>
              <input className="field" maxLength={250} aria-label="Интересы клуба" value={editInterests} onChange={e=>setEditInterests(e.target.value)} placeholder="Спиннинг, судак, стритфишинг"/>
              <textarea className="field min-h-24" maxLength={1000} aria-label="Описание клуба" value={editDescription} onChange={e=>setEditDescription(e.target.value)} placeholder="Описание клуба"/>
              <div className="flex gap-2"><button className="btn-primary" type="button" disabled={busy} onClick={()=>void saveGroup()}>Сохранить</button><button className="btn-ghost" type="button" onClick={()=>setEditingGroup("")}>Отмена</button></div>
            </div>}
          </div>)}
          {!joined.length&&<p className="text-sm text-zinc-500">Пока клубов нет. Можно получить приглашение от друга или подать заявку на собственный.</p>}
        </div>
        <div>
          <h3 className="mb-3 font-bold">Приглашения ({pending.length})</h3>
          {pending.map(m=><div key={m.group_id} className="mb-2 rounded-xl border border-white/10 p-3 text-sm">
            <strong>{groups.find(g=>g.id===m.group_id)?.name||"Клуб ZAPRUDA"}</strong>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-primary inline-flex" disabled={busy} onClick={()=>void respond(m,"accepted")}><Check className="size-4"/> Принять</button>
              <button type="button" className="btn-ghost inline-flex" disabled={busy} onClick={()=>void respond(m,"declined")}><X className="size-4"/> Отклонить</button>
            </div>
          </div>)}
          {!pending.length&&<p className="text-xs text-zinc-500">Приглашений пока нет.</p>}
        </div>
      </div>
      <div className="space-y-5">
        <form className="space-y-3 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/5 p-4" onSubmit={requestClub}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-extrabold">Создать свой клуб</h3>
            <span className="rounded-lg bg-[#D7FF35] px-3 py-1.5 text-sm font-black text-black">500 ₽ · один раз</span>
          </div>
          <p className="text-xs leading-5 text-zinc-400">Название, город, описание, приглашения и личный клубный чат. Это стоимость создания, а не подписка. <strong>Оплата пока не подключена.</strong> Сейчас можно оставить заявку без списания денег.</p>
          <input className="field" minLength={3} maxLength={80} required placeholder="Название клуба" value={newName} onChange={e=>setNewName(e.target.value)}/>
          <input className="field" maxLength={100} placeholder="Город" value={city} onChange={e=>setCity(e.target.value)}/>
          <textarea className="field min-h-20" maxLength={500} placeholder="Что будете обсуждать? Например: стритфишинг на Оке, рыбалка с лодки и эхолотом" value={description} onChange={e=>setDescription(e.target.value)}/>
          <button type="submit" disabled={busy||newName.trim().length<3} className="btn-primary inline-flex"><Plus className="size-4"/> Оставить заявку на клуб</button>
          {requests.map(r=><div key={r.id} className="rounded-lg border border-white/10 bg-black/15 p-3 text-xs">
            <strong>{r.name}</strong> · {r.fee_rub} ₽
            <p className="mt-1 text-zinc-400">{r.status==="awaiting_payment"?"Ожидает подключения оплаты / подтверждения":r.status==="paid"?"Оплата подтверждена — клуб создан автоматически":"Заявка закрыта"}</p>
            
          </div>)}
        </form>
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
          <h3 className="flex items-center gap-2 font-bold"><UserPlus className="size-4 text-[#D7FF35]"/> Пригласить в свой клуб</h3>
          <select aria-label="Выбрать собственный клуб" className="field" value={groupId} onChange={e=>setGroupId(e.target.value)}>
            <option value="">Выбери свой клуб</option>{own.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select aria-label="Выбрать рыболова" className="field" value={inviteId} onChange={e=>setInviteId(e.target.value)}>
            <option value="">Кого пригласить?</option>
            {people.filter(p=>!members.some(m=>m.group_id===groupId&&m.user_id===p.id)).map(p=><option key={p.id} value={p.id}>{display(p)}</option>)}
          </select>
          <button type="button" className="btn-primary inline-flex" disabled={!inviteId||!groupId||busy} onClick={()=>void invite()}><UserPlus className="size-4"/> Пригласить</button>
          <p className="text-xs text-zinc-400">Для индивидуального обсуждения выезда можно перейти в <Link to="/messages" search={{mark:""}} className="underline text-[#D7FF35]">личные сообщения</Link>.</p>
        </div>
      </div>
      {activeGroup&&joined.some(g=>g.id===activeGroup)&&<div className="space-y-3 rounded-xl border border-[#D7FF35]/20 p-4 lg:col-span-2">
        <h3 className="flex items-center gap-2 font-bold"><MessageCircle className="size-5 text-[#D7FF35]"/> Чат клуба «{groups.find(g=>g.id===activeGroup)?.name||"ZAPRUDA"}»</h3>
        <p className="text-xs text-zinc-400">Только участники, принявшие приглашение, могут читать и писать сюда. Планируйте совместные выезды без публикации приватных координат.</p>
        <div className="zapruda-chat-window max-h-80 min-h-44 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-3">
          {!messages.length&&<p className="text-sm text-zinc-500">Тут пока тихо. Начни обсуждение!</p>}
          {messages.map(msg=><div key={msg.id} className="zapruda-chat-bubble rounded-xl border border-white/10 p-3 text-sm">
            <p className="mb-1 text-[11px] font-semibold text-[#D7FF35]">{msg.user_id===uid?"Вы":display(people.find(p=>p.id===msg.user_id))} · {new Date(msg.created_at).toLocaleString("ru-RU")}</p>
            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
          </div>)}
        </div>
        <form className="flex gap-2" onSubmit={send}><input className="field min-w-0 flex-1" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Сообщение только участникам клуба…" />
          <button className="btn-primary inline-flex" type="submit" disabled={!draft.trim()||busy}><Send className="size-4"/> Отправить</button>
        </form>
      </div>}
    </div>}
  </section>;
}
