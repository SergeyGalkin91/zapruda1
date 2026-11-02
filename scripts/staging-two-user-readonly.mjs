#!/usr/bin/env node
// Read-only, real-JWT STAGING verification. No test data, no admin credentials.
const endpoint = 'https://yudtbifopfnjtjanaqrd.supabase.co';
if (process.env.ZAPRUDA_TEST_TARGET !== 'STAGING' || process.env.STAGING_URL !== endpoint) {
  console.error('BLOCKED: this test only runs against the approved STAGING URL');
  process.exit(2);
}
const key=process.env.STAGING_KEY;
const users=[['A',process.env.USER_A_EMAIL,process.env.USER_A_PASSWORD],['B',process.env.USER_B_EMAIL,process.env.USER_B_PASSWORD]];
if (!key) {console.error('INCOMPLETE: missing publishable STAGING key');process.exit(3);}
if(users.some(([,email,pw])=>!email||!pw)||users[0][1]===users[1][1]){
 console.error('INCOMPLETE: two distinct confirmed test account credentials are required locally');
 process.exit(3);
}
async function request(path,token,options={}){
 const response=await fetch(endpoint+path,{...options,headers:{apikey:key,Authorization:'Bearer '+(token??key),'Content-Type':'application/json',...options.headers}});
 const result=await response.json().catch(()=>null);
 return {status:response.status,data:result};
}
const sessions=[];
for(const [label,email,password] of users){
 const res=await request('/auth/v1/token?grant_type=password',null,{method:'POST',body:JSON.stringify({email,password})});
 if(res.status!==200||!res.data?.access_token||!res.data?.user?.id){
  console.error('INCOMPLETE: account '+label+' has no valid confirmed session (HTTP '+res.status+')');process.exit(3);
 }
 sessions.push({label,id:res.data.user.id,token:res.data.access_token});
}
if(sessions[0].id===sessions[1].id){console.error('FAIL: sessions resolve to the same user');process.exit(1);}
let failures=0;
function check(name,pass,detail=''){console.log((pass?'PASS ':'FAIL ')+name+(detail?' '+detail:''));if(!pass)failures++;}
const anonPublic=await request('/rest/v1/profiles?select=id,username,display_name,avatar_url&limit=1');
check('anon public profile identity',anonPublic.status===200);
const anonPrivate=await request('/rest/v1/profiles?select=bio&limit=1');
check('anon cannot SELECT bio',anonPrivate.status===401||anonPrivate.status===403);
for(const s of sessions){
 const own=await request('/rest/v1/rpc/my_profile_full',s.token,{method:'POST',body:'{}'});
 check(s.label+' owner RPC',own.status===200&&Array.isArray(own.data)&&own.data.length===1&&own.data[0]?.id===s.id);
 const table=await request('/rest/v1/profiles?select=bio&limit=1',s.token);
 check(s.label+' cannot SELECT biographies from table',table.status===401||table.status===403);
 const foreign=sessions.find(x=>x.id!==s.id);
 const foreignRow=await request('/rest/v1/profiles?select=id,username&id=eq.'+foreign.id,s.token);
 check(s.label+' can see foreign public identity',foreignRow.status===200);
}
console.log(failures?'FAIL '+failures:'PASS: read-only JWT privacy checks');
process.exit(failures?1:0);
