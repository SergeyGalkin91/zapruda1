/* eslint-disable prettier/prettier -- Protected STAGING assertions and masked viewport evidence. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium,firefox,webkit } from "playwright";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { appThemeButton }=require("../browser-appearance-controls.cjs");
const { assertShellBounds }=require("../browser-shell-bounds.cjs");

const url=process.env.ZAPRUDA_E2E_STAGING_URL;
const key=process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const base=process.env.ZAPRUDA_BROWSER_BASE_URL;
const approvedZone=process.env.ZAPRUDA_OSP_E2E_ZONE_ID?.trim();
assert.equal(url,"https://yudtbifopfnjtjanaqrd.supabase.co","Refusing a non-STAGING project");
assert(key?.startsWith("sb_publishable_") || key?.startsWith("eyJ"),"STAGING public key is required");
assert.equal(base,"http://127.0.0.1:3000","Use the protected exact-source local frontend");
if(approvedZone)assert.match(approvedZone,/^[0-9a-f-]{36}$/i,"Invalid operator-designated zone ID");
const out="qa/on-spot-live";mkdirSync(out,{recursive:true});
const result={sha:process.env.GITHUB_SHA,scope:"actual confirmed STAGING JWT and local frontend; not Netlify hosted",checks:[],screenshots:[],cleanup:true,passed:false,positive:"BLOCKED: no operator-designated reviewed zone",failurePhase:null};
const actors=[],browsers=[],cleanup=[];
let phase="auth",failure=false;
function client(token){
  return createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    ...(token?{global:{headers:{Authorization:"Bearer "+token}}}:{}),
  });
}
async function must(query,label){
  const r=await query;
  if(r.error)throw new Error(label+": "+(r.error.code||r.status||"request failed"));
  return r.data;
}
async function deny(query,label){
  const r=await query;
  assert(r.error,label);
  assert([401,403,404].includes(r.status)||["42501","PGRST106","PGRST202"].includes(r.error.code),label+": wrong denial");
}
async function login(role){
  const api=client();
  const email=process.env["ZAPRUDA_E2E_"+role+"_EMAIL"], password=process.env["ZAPRUDA_E2E_"+role+"_PASSWORD"];
  assert(email&&password,"Missing protected credentials for "+role);
  const data=await must(api.auth.signInWithPassword({email,password}),"Confirmed test sign-in");
  const auth=await must(api.auth.getUser(),"Validate signed JWT");
  assert(auth.user?.email_confirmed_at&&!auth.user.is_anonymous&&data.session?.access_token,"Confirmed signed JWT required");
  const actor={role,api,id:auth.user.id,token:data.session.access_token};
  actors.push(actor);return actor;
}
const social=(a,name,z,p={})=>a.api.rpc("zc_osp_social",{p_action:name,p_zone:z,p_payload:p});
const catalog=a=>must(a.api.rpc("zc_osp_catalog"),"Own catalog");
const join=(a,z)=>must(a.api.rpc("zc_osp_join",{p_zone:z}),"Join chosen zone");
const leave=(a,z)=>must(a.api.rpc("zc_osp_leave",{p_zone:z}),"Leave chosen zone");
const read=(a,place,id)=>must(a.api.from("chat_messages").select("id").eq("place_id",place).eq("id",id),"Read own authorized room");
const ids=async(a,place,body)=>must(a.api.from("chat_messages").select("id").eq("place_id",place).eq("user_id",a.id).eq("body",body),"Owned message lookup");
async function remove(a,place,body){
  for(const {id} of await ids(a,place,body)){
    await must(a.api.from("chat_messages").delete().eq("id",id).eq("place_id",place).eq("user_id",a.id).eq("body",body),"Clean exact owned message");
  }
  assert.deepEqual(await ids(a,place,body),[],"Owned cleanup incomplete");
}
async function loginUI(page,a){
  await page.goto(base+"/auth?mode=in",{waitUntil:"domcontentloaded"});
  assert.equal(new URL(page.url()).origin,base,"Credentials must stay on approved frontend");
  await page.getByLabel("Email",{exact:true}).fill(process.env["ZAPRUDA_E2E_"+a.role+"_EMAIL"]);
  await page.getByLabel("Пароль",{exact:true}).fill(process.env["ZAPRUDA_E2E_"+a.role+"_PASSWORD"]);
  await page.getByRole("button",{name:"Войти в ZAPRUDA →",exact:true}).click();
  await page.waitForURL(base+"/profile",{timeout:20000});
  await page.getByRole("button",{name:"Выйти из аккаунта",exact:true}).waitFor({state:"visible"});
}
function watch(context){
  const errors=[];
  context.on("request",request=>{
    const origin=new URL(request.url()).origin;
    if(origin.endsWith(".supabase.co")&&origin!==url)errors.push("unexpected backend");
  });
  context.on("page",page=>page.on("pageerror",()=>errors.push("uncaught browser error")));
  return errors;
}
async function shot(page,name){
  await page.screenshot({path:out+"/"+name+".png",fullPage:false,
    mask:[page.locator("input[type=email],input[type=password]"),page.getByText(/[^\s]+@[^\s]+/)]});
  result.screenshots.push(name+".png");
}
async function openCatalog(page){
  await page.goto(base+"/on-spot",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"ON SPOT+",exact:true}).waitFor();
  await page.getByRole("button",{name:"Обновить зоны",exact:true}).waitFor();
  await page.getByRole("status").filter({hasText:"Загружаем локальные зоны"}).waitFor({state:"hidden"});
  assert.equal(await page.getByRole("alert").count(),0,"Catalog rendered an error");
}
async function positiveApi(a,b,c,zone){
  const z=zone.zone_id,room=zone.chat_place_id;
  const bodyA="STAGING ON SPOT QA "+randomUUID(),bodyB="STAGING ON SPOT reply "+randomUUID();
  const messageId=randomUUID(),replyId=randomUUID();
  for(const actor of [a,b])assert.equal((await catalog(actor)).find(x=>x.zone_id===z)?.is_member,false,"Use a designated clean QA zone");
  assert.equal(await join(a,z),room);
  cleanup.push(async()=>leave(a,z));
  assert.equal(await join(a,z),room);
  assert.equal(await join(b,z),room);
  cleanup.push(async()=>leave(b,z));
  cleanup.push(()=>remove(a,room,bodyA),()=>remove(b,room,bodyB));
  assert.deepEqual(await read(c,room,messageId),[]);
  await deny(c.api.from("chat_messages").insert({id:randomUUID(),user_id:c.id,body:"QA denied",place_id:room,topic:"general"}),"Outsider must not send");
  let notify;
  const received=new Promise(resolve=>{notify=resolve;});
  await b.api.realtime.setAuth(b.token);
  const channel=b.api.channel("osp-e2e-"+randomUUID(),{config:{postgres_changes_options:{wait:true,timeout:20000}}})
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"place_id=eq."+room},
     e=>{if(e.new?.id===messageId&&e.new?.body===bodyA)notify(true);});
  cleanup.push(()=>b.api.removeChannel(channel));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("Realtime subscription deadline")),25000);
    channel.subscribe(status=>{
      if(status==="SUBSCRIBED"){clearTimeout(timer);resolve();}
      else if(["CHANNEL_ERROR","TIMED_OUT"].includes(status)){clearTimeout(timer);reject(Error("Realtime subscribe failed"));}
    });
  });
  await must(a.api.from("chat_messages").insert({id:messageId,user_id:a.id,body:bodyA,place_id:room,topic:"general"}),"Real member send");
  let timer;
  try{await Promise.race([received,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Real Realtime INSERT was not delivered")),20000);})]);}
  finally{clearTimeout(timer);}
  assert.deepEqual(await read(b,room,messageId),[{id:messageId}]);
  assert.deepEqual(await read(c,room,messageId),[]);
  await must(b.api.from("chat_messages").insert({id:replyId,user_id:b.id,body:bodyB,place_id:room,topic:"general"}),"Real member reply");
  assert.deepEqual(await read(a,room,replyId),[{id:replyId}]);
  await must(social(a,"presence_on",z,{minutes:30,discoverable:false}),"Explicit presence");
  const presence=await must(social(a,"snapshot",z),"Own presence");
  assert(presence.presence&&!presence.presence.discoverable&&!presence.announcements,"Presence must not imply other consents");
  await must(social(a,"presence_off",z),"Immediate presence off");
  assert.equal((await must(social(a,"snapshot",z),"Presence readback")).presence,null);
  await remove(b,room,bodyB);
  await leave(b,z);
  assert.deepEqual(await read(b,room,messageId),[]);
  assert.deepEqual(await must(b.api.rpc("chat_room_read_summary",{p_place:room}),"Post-leave markers"),[]);
  await deny(b.api.from("chat_messages").insert({user_id:b.id,body:"QA denied after leave",place_id:room,topic:"general"}),"Departed user must not send");
  result.checks.push("two distinct signed actors joined/replied; actual Realtime INSERT; stranger/post-leave deny; explicit presence/off");
  // Clean this first API phase before the independent browser journey.
  while(cleanup.length)await cleanup.pop()();
}
async function positiveBrowser(browser,state,b,zone){
  const a=actors[0],room=zone.chat_place_id,z=zone.zone_id;
  const name="STAGING ON SPOT UI "+randomUUID();
  const ca=await browser.newContext({storageState:state,viewport:{width:390,height:844}});
  const cb=await browser.newContext({viewport:{width:390,height:844}});
  const errorsA=watch(ca),errorsB=watch(cb);
  const pa=await ca.newPage(),pb=await cb.newPage();
  const card=p=>p.getByRole("list",{name:"Проверенные локальные зоны"}).getByRole("listitem").filter({has:p.getByRole("heading",{name:zone.name,exact:true})});
  cleanup.push(async()=>{await ca.close();await cb.close();});
  cleanup.push(()=>leave(a,z),()=>leave(b,z),()=>remove(a,room,name));
  await loginUI(pb,b);
  for(const p of [pa,pb]){
    await openCatalog(p);
    await card(p).getByRole("button",{name:"Вступить в зону "+zone.name,exact:true}).click();
    await card(p).getByRole("link",{name:"Открыть чат",exact:true}).click();
    await p.getByRole("heading",{name:zone.name,exact:true}).waitFor();
  }
  await pa.getByLabel("Сообщение для выбранной ветки",{exact:true}).fill(name);
  await pa.getByRole("button",{name:"Отправить",exact:true}).click();
  await pb.getByText(name,{exact:true}).waitFor({timeout:25000});
  await shot(pb,"390-real-zone-received");
  await pb.reload({waitUntil:"domcontentloaded"});
  await pb.getByText(name,{exact:true}).waitFor();
  await openCatalog(pb);
  await card(pb).getByRole("button",{name:"Выйти из зоны "+zone.name,exact:true}).click();
  await card(pb).getByRole("button",{name:"Вступить в зону "+zone.name,exact:true}).waitFor();
  await pb.goto(base+"/chat?place="+room+"&topic=general");
  await pb.getByRole("heading",{name:"Чат недоступен",exact:true}).waitFor();
  assert.equal(await pb.getByLabel("Сообщение для выбранной ветки",{exact:true}).count(),0);
  // Switch accounts in one browser and require a new authenticated identity, not cached private state.
  await pa.goto(base+"/profile");
  await pa.getByRole("button",{name:"Выйти из аккаунта",exact:true}).click();
  await pa.waitForURL(base+"/");
  await loginUI(pa,b);
  await pa.goto(base+"/chat?place="+room+"&topic=general");
  await pa.getByRole("heading",{name:"Чат недоступен",exact:true}).waitFor();
  assert.equal(await pa.getByText(name,{exact:true}).count(),0);
  assert.deepEqual([...errorsA,...errorsB],[]);
  result.checks.push("two actual mobile UI logins; join/send/receive; reload; leave; same-browser identity change denies old zone");
  while(cleanup.length)await cleanup.pop()();
}
try{
  const a=await login("RACER_A"),b=await login("RACER_B"),c=await login("SEATED");
  assert.equal(new Set(actors.map(x=>x.id)).size,3,"Independent account identities required");
  phase="actual API boundary";
  const guest=client(), unknown=randomUUID(), fakeRoom=randomUUID();
  await deny(guest.rpc("zc_osp_catalog"),"Guest catalog must be denied");
  await deny(guest.rpc("zc_osp_social",{p_action:"snapshot",p_zone:unknown}),"Guest social RPC must be denied");
  const lists=await Promise.all(actors.map(catalog));
  assert.equal((await must(social(c,"presence_off",unknown),"Installed social RPC and harmless idempotent off")).ok,true);
  for(const list of lists)for(const row of list)
    assert.deepEqual(Object.keys(row).sort(),["area_label","chat_place_id","country_code","is_member","name","zone_id"]);
  await deny(a.api.rpc("zc_osp_join",{p_zone:unknown}),"Unknown zone must be denied");
  await deny(social(a,"presence_on",unknown,{minutes:30}),"Nonmember presence denied");
  await deny(social(a,"snapshot",unknown),"Nonmember snapshot denied");
  await deny(a.api.schema("zc_osp_internal").from("memberships").select("user_id"),"Private schema must not be exposed");
  assert.deepEqual(await must(a.api.rpc("chat_room_read_summary",{p_place:fakeRoom}),"Read unknown place summary"),[]);
  await deny(a.api.from("chat_messages").insert({user_id:a.id,body:"QA denied",place_id:fakeRoom,topic:"general"}),"Unknown room insert denied");
  assert((await must(a.api.from("chat_places").select("id").eq("id","00000000-0000-4000-8000-000000000001"),"Global chat baseline")).length===1);
  result.checks.push("three confirmed JWTs; catalog allowlist; guest/private/unknown room/snapshot denial; global baseline");
  result.catalogEmpty=lists.every(l=>l.length===0);
  const zone=approvedZone?lists[0].find(x=>x.zone_id===approvedZone):null;
  if(approvedZone&&!zone)result.positive="BLOCKED: designated zone absent from the approved catalog";
  if(zone){phase="two-user real API";await positiveApi(a,b,c,zone);}

  phase="actual authenticated mobile browser";
  const authBrowser=await chromium.launch();browsers.push(authBrowser);
  const authContext=await authBrowser.newContext({viewport:{width:390,height:844}});
  const authPage=await authContext.newPage();
  await loginUI(authPage,a);
  const state=await authContext.storageState(); // memory only: never upload tokens/cookies.
  await authContext.close();
  phase="three-engine mobile matrix";
  for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
    const browser=engine==="chromium"?authBrowser:await type.launch();
    if(engine!=="chromium")browsers.push(browser);
    for(const width of [320,390]){
      const context=await browser.newContext({storageState:state,viewport:{width,height:844},reducedMotion:"reduce",locale:"ru-RU"});
      const errors=watch(context);const page=await context.newPage();
      for(const theme of ["classic","electric-blue"]){
        result.matrix={engine,width,theme};
        await page.goto(base+"/settings",{waitUntil:"domcontentloaded"});
        await page.locator('[data-appearance-ready="true"]').waitFor({state:"visible"});
        const choice=appThemeButton(page,theme);
        assert.equal(await choice.count(),1);
        await choice.click();
        await page.waitForFunction(t=>document.documentElement.dataset.zaprudaBackground===t,theme);
        for(const [label,value] of [["Matte Black","matte-black"],["Carbon","carbon"],["Neon Threads","neon-threads"],["Topographic","topographic"]]){
          const paper=page.locator('section[aria-labelledby="wallpaper-title"]').getByRole("button",{name:new RegExp("^"+label)});
          assert.equal(await paper.count(),1);await paper.click();
          await page.reload({waitUntil:"domcontentloaded"});
          await page.waitForFunction(p=>document.documentElement.dataset.zaprudaWallpaper===p,value);
          await page.locator('[data-appearance-ready="true"]').waitFor({state:"visible"});
          assert.equal(await paper.getAttribute("aria-pressed"),"true");
          assert.equal(await page.locator("html").getAttribute("data-zapruda-background"),theme);
        }
        await openCatalog(page);
        if(result.catalogEmpty)await page.getByText(/Проверенные локальные зоны ещё не открыты/).waitFor();
        await assertShellBounds(page);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
        await shot(page,engine+"-"+width+"-"+theme+"-on-spot");
      }
      assert.deepEqual(errors,[]);await context.close();
    }
  }
  result.checks.push("actual signed-in browser on Chromium/Firefox/WebKit, 320/390px, both themes and all four wallpapers persisted");
  if(zone){phase="two-user real browser";await positiveBrowser(authBrowser,state,b,zone);result.positive="PASS";}
  result.passed=true;
}catch{
  result.failurePhase=phase;failure=true;
}finally{
  while(cleanup.length){try{await cleanup.pop()();}catch{result.cleanup=false;failure=true;}}
  for(const b of browsers)await b.close().catch(()=>undefined);
  for(const a of actors)await a.api.auth.signOut({scope:"local"}).catch(()=>undefined);
  writeFileSync(out+"/result.json",JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify({sha:result.sha,checks:result.checks.length,screenshots:result.screenshots.length,positive:result.positive,cleanup:result.cleanup,failurePhase:result.failurePhase}));
}
if(failure)process.exitCode=1;
