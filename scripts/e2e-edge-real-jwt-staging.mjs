// STAGING ONLY: real HTTP/JWT checks for xAI daily advice and OpenWeather.
// Uses existing protected OWNER credentials. No secrets, tokens, or raw GPS logged.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
function required(n) { const v=process.env[n]; if(!v) throw Error('Missing protected setting '+n); return v; }
const url=required('ZAPRUDA_E2E_STAGING_URL');
assert.equal(new URL(url).origin,'https://yudtbifopfnjtjanaqrd.supabase.co');
const key=required('ZAPRUDA_E2E_PUBLISHABLE_KEY');
assert.ok(key.startsWith('sb_publishable_'));
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.auth.signInWithPassword({
 email:required('ZAPRUDA_E2E_OWNER_EMAIL'),
 password:required('ZAPRUDA_E2E_OWNER_PASSWORD')
});
if(error)throw error;
assert.ok(data.user?.email_confirmed_at && data.session?.access_token,'Verified OWNER JWT required');
const endpoint=name=>url+'/functions/v1/'+name;
async function invoke(name,token,body) {
 const r=await fetch(endpoint(name),{method:'POST',headers:{
  'Content-Type':'application/json','apikey':key,
  ...(token?{'Authorization':'Bearer '+token}:{})
 },body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
 const raw=await r.text();
 let json;try{json=JSON.parse(raw)}catch{throw Error(name+' non-JSON response status '+r.status)}
 return {status:r.status,json};
}
try {
 for (const name of ['openweather-current','zapruda-daily-advice']) {
  const result=await invoke(name,null,{city:'Нижний Новгород',location:'Ока'});
  assert.equal(result.status,401,name+' must reject missing JWT');
  console.log('PASS',name,'no JWT rejected 401');
 }
 const jwt=data.session.access_token;
 const invalid=await invoke('openweather-current',jwt,{lat:56.33});
 assert.equal(invalid.status,400,'Partial coordinates must return 400');
 const weather=await invoke('openweather-current',jwt,{city:'Нижний Новгород'});
 assert.equal(weather.status,200,'Live weather must return 200');
 assert.equal(weather.json.source,'OpenWeather');
 for (const k of ['lat','lon','latitude','longitude']) {
  assert.ok(!(k in weather.json),'Coordinates leaked in weather response');
  assert.ok(!(k in (weather.json.report_fields??{})),'Coordinates leaked into autofill');
 }
 assert.ok(Number.isFinite(weather.json.pressure_mmhg),'Missing pressure conversion');
 console.log('PASS live OpenWeather response: unit conversion, no raw coordinates');
 const invalidAdvice=await invoke('zapruda-daily-advice',jwt,{location:'X'});
 assert.equal(invalidAdvice.status,400,'Invalid location should reject 400');
 // A real advice consumes the test user's daily quota. Repeated request must not spend twice.
 const input={location:'QA Нижний Новгород река Ока',target:'Окунь',time:'Утро'};
 const first=await invoke('zapruda-daily-advice',jwt,input);
 assert.equal(first.status,200,'Live xAI answer must return 200');
 assert.ok(typeof first.json.answer==='string'&&first.json.answer.length>=40,'No real advice');
 const second=await invoke('zapruda-daily-advice',jwt,input);
 assert.equal(second.status,200,'Second daily request must return cached answer');
 assert.equal(second.json.already_used,true,'Daily quota not cached');
 assert.equal(second.json.answer,first.json.answer,'Daily answer changed');
 console.log('PASS live xAI advice + cached daily quota');
} finally { await client.auth.signOut(); }
