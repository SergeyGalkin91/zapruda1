// STAGING-only true JWT competition last-slot concurrency test.
// 4 disposable verified users: OWNER, SEATED, RACER_A, RACER_B.
// Leaves fixture for cleanup. Do not use production credentials.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const required = name => { const v=process.env[name]; if (!v) throw Error('Missing '+name); return v; };
const url = required('ZAPRUDA_E2E_STAGING_URL');
assert.equal(new URL(url).origin, 'https://yudtbifopfnjtjanaqrd.supabase.co');
const key = required('ZAPRUDA_E2E_PUBLISHABLE_KEY');
assert.ok(key.startsWith('sb_publishable_'));
const roles = ['OWNER','SEATED','RACER_A','RACER_B'];
const clients = await Promise.all(roles.map(async role => {
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signInWithPassword({
   email:required('ZAPRUDA_E2E_'+role+'_EMAIL'),
   password:required('ZAPRUDA_E2E_'+role+'_PASSWORD')
 });
 if(error)throw error;
 assert.ok(data.session?.access_token,role+' missing JWT');
 return {role,client,id:data.user.id};
}));
assert.equal(new Set(clients.map(x=>x.id)).size,4,'Distinct users required');
const [organizer,seated,a,b]=clients;
const label='QA_COMP_RACE_'+Date.now();
const start=new Date(Date.now()+86400_000).toISOString();
const end=new Date(Date.now()+2*86400_000).toISOString();
const {data:comp,error:createError}=await organizer.client.from('competitions').insert({
 organizer_id:organizer.id,title:label,starts_at:start,ends_at:end,status:'open',max_teams:2
}).select('id').single();
if(createError)throw createError;
console.log('STAGING competition QA fixture:',comp.id,'cleanup required');
const registered=(user,name)=>user.client.from('competition_teams').insert({
 competition_id:comp.id,captain_id:user.id,name,status:'registered'
}).select('id,status').single();
const first=await registered(seated,label+'_seated');if(first.error)throw first.error;
// A captain must not register a team on behalf of a different account.
const {error:spoofError}=await a.client.from('competition_teams').insert({
 competition_id:comp.id,captain_id:b.id,name:label+'_spoofed',status:'registered'
});
assert.ok(spoofError,'Captain identity spoofed through team INSERT');
// Captain and competition ID are immutable even when a row is otherwise updateable.
const {data:tampered,error:tamperError}=await seated.client.from('competition_teams')
 .update({captain_id:a.id}).eq('id',first.data.id).select('captain_id');
assert.ok(tamperError || (tampered??[]).length===0,'Captain ID unexpectedly changed');
const {data:unchanged,error:verifyError}=await seated.client.from('competition_teams')
 .select('captain_id').eq('id',first.data.id).single();
if(verifyError)throw verifyError;
assert.equal(unchanged.captain_id,seated.id,'Captain identity changed');
const results=await Promise.all([registered(a,label+'_a'),registered(b,label+'_b')]);
const success=results.filter(x=>!x.error),failed=results.filter(x=>x.error);
assert.equal(success.length,1,'Exactly one last-seat registration required');
assert.equal(failed.length,1,'Other registration must fail');
assert.match(failed[0].error.message,/COMPETITION_FULL/,'Expected COMPETITION_FULL');
const {data:teams,error:readError}=await organizer.client.from('competition_teams')
 .select('captain_id,status').eq('competition_id',comp.id);
if(readError)throw readError;
const accepted=teams.filter(x=>x.status==='registered');
assert.equal(accepted.length,2,'Competition capacity exceeded');
assert.ok(accepted.some(x=>x.captain_id===seated.id));
console.log('PASS: 4 real JWT, simultaneous last-seat inserts, exactly two registered.');
for(const u of clients)await u.client.auth.signOut();
