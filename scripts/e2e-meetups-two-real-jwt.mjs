// Real Auth/PostgREST STAGING-only meetup E2E. Requires disposable verified accounts.
// All secrets supplied by protected environment. Leaves QA fixture for inspection.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const env=(k)=>{const v=process.env[k];if(!v)throw Error('Missing '+k);return v};
const url=env('ZAPRUDA_E2E_STAGING_URL');
assert.equal(new URL(url).origin,'https://yudtbifopfnjtjanaqrd.supabase.co');
const key=env('ZAPRUDA_E2E_PUBLISHABLE_KEY');
assert.ok(key.startsWith('sb_publishable_'));
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const owner=client(),guest=client(),anonymous=client();
async function login(c,prefix){
 const {data,error}=await c.auth.signInWithPassword({email:env(prefix+'_EMAIL'),password:env(prefix+'_PASSWORD')});
 if(error)throw error;
 assert.ok(data.session?.access_token);
 return data.user.id;
}
const a=await login(owner,'ZAPRUDA_E2E_OWNER');
const b=await login(guest,'ZAPRUDA_E2E_INVITEE');
assert.notEqual(a,b);
const label='QA_E2E_STAGING_'+Date.now();
const {data:post,error:createError}=await owner.from('meetup_posts').insert({
 owner_id:a,country_code:'SE',region_code:'QA',city_code:'QA',title:label,
 description:'Disposable STAGING auth QA fixture',
}).select('id').single();
if(createError)throw createError;
const id=post.id;
console.log('QA meetup created:',id,'(cleanup required)');
const {data:bootstrap,error:bootstrapError}=await owner.from('meetup_members').select('role,status').eq('post_id',id).eq('user_id',a).single();
if(bootstrapError)throw bootstrapError;
assert.equal(bootstrap.role,'owner');assert.equal(bootstrap.status,'accepted');
const {data:detail,error:detailError}=await owner.from('meetup_private_details').insert({
 post_id:id,owner_id:a,private_place:'PRIVATE QA PLACE',latitude:59.32,longitude:18.06
}).select('post_id').single();
if(detailError)throw detailError;assert.equal(detail.post_id,id);
const {data:outside,error:outsideError}=await guest.from('meetup_private_details').select('post_id').eq('post_id',id);
if(outsideError)throw outsideError;assert.equal(outside.length,0,'Outsider can read private GPS');
const {data:anonDetails,error:anonError}=await anonymous.from('meetup_private_details').select('post_id').eq('post_id',id);
assert.ok(anonError || anonDetails.length===0,'Anonymous user can read GPS');
const {error:selfAcceptError}=await guest.from('meetup_members').insert({post_id:id,user_id:b,role:'participant',status:'accepted'});
assert.ok(selfAcceptError,'Guest bypassed approval');
const {error:joinError}=await guest.from('meetup_members').insert({post_id:id,user_id:b,role:'participant',status:'pending'});
if(joinError)throw joinError;
// Verify pending users cannot read or write the accepted-only chat.
const {data:pendingMessages,error:pendingMessagesError}=await guest.from('meetup_messages').select('id').eq('post_id',id);
if(pendingMessagesError)throw pendingMessagesError;
assert.equal(pendingMessages.length,0,'Pending member can read messages');
const {error:pendingSendError}=await guest.from('meetup_messages').insert({
 post_id:id,sender_id:b,body:'FORBIDDEN pending message'
});
assert.ok(pendingSendError,'Pending member can send private messages');
const {data:selfApproval, error:outsiderApproveError}=await guest.from('meetup_members').update({status:'accepted'})
 .eq('post_id',id).eq('user_id',b).select('status');
assert.ok(outsiderApproveError || selfApproval.length===0,'Pending user can self-approve');
const {data:stillPending,error:stateError}=await guest.from('meetup_members')
 .select('status').eq('post_id',id).eq('user_id',b).single();
if(stateError)throw stateError;
assert.equal(stillPending.status,'pending','Self-approval changed membership');
const {error:outsiderModifyError}=await guest.from('meetup_private_details').upsert({
 post_id:id,owner_id:a,private_place:'FORBIDDEN overwrite'
},{onConflict:'post_id'});
assert.ok(outsiderModifyError,'Pending member can overwrite private location');
const {data:pendingDetails,error:pendingError}=await guest.from('meetup_private_details').select('post_id').eq('post_id',id);
if(pendingError)throw pendingError;assert.equal(pendingDetails.length,0,'Pending guest can read GPS');
const {error:approveError}=await owner.from('meetup_members').update({status:'accepted'}).eq('post_id',id).eq('user_id',b);
if(approveError)throw approveError;
const {data:allowed,error:allowedError}=await guest.from('meetup_private_details').select('post_id').eq('post_id',id);
if(allowedError)throw allowedError;assert.equal(allowed.length,1,'Accepted guest cannot read private location');
const {error:messageError}=await guest.from('meetup_messages').insert({post_id:id,sender_id:b,body:'QA accepted private conversation'});
if(messageError)throw messageError;
const {data:messages,error:messagesError}=await owner.from('meetup_messages').select('body').eq('post_id',id);
if(messagesError)throw messagesError;assert.equal(messages.length,1);
console.log('PASS: two real JWT, private GPS and chat denied before approval, self-approval and location overwrite denied, accepted chat works. Fixture must be cleaned.');
await Promise.all([owner.auth.signOut(),guest.auth.signOut()]);
