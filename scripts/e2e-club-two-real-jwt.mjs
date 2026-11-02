// Real JWT REST/E2E gate for a PRE-CREATED disposable STAGING club.
// Requires two existing test accounts, already provisioned club owned by account A,
// and account B not yet a member. Never set production secrets here.
// Run: ZAPRUDA_E2E_STAGING_URL=... ZAPRUDA_E2E_PUBLISHABLE_KEY=...
//      ZAPRUDA_E2E_OWNER_EMAIL=... ZAPRUDA_E2E_OWNER_PASSWORD=...
//      ZAPRUDA_E2E_INVITEE_EMAIL=... ZAPRUDA_E2E_INVITEE_PASSWORD=...
//      ZAPRUDA_E2E_CLUB_ID=... node scripts/e2e-club-two-real-jwt.mjs
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const get = key => {
  const value = process.env[key];
  if (!value) throw Error('Missing required E2E environment variable: ' + key);
  return value;
};
const url = get('ZAPRUDA_E2E_STAGING_URL').replace(/\/+$/,'');
assert.equal(new URL(url).hostname, 'yudtbifopfnjtjanaqrd.supabase.co', 'Refusing non-STAGING URL');
const key = get('ZAPRUDA_E2E_PUBLISHABLE_KEY');
assert.ok(key.startsWith('sb_publishable_'), 'Use a public publishable key only');
const group = get('ZAPRUDA_E2E_CLUB_ID');
assert.match(group, /^[0-9a-f-]{36}$/i);
const client = () => createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const owner=client(),invitee=client(),outsider=client();
const signIn = async (c,email,password) => {
 const {data,error}=await c.auth.signInWithPassword({email,password});
 if(error) throw Error('Login failed: '+error.message);
 assert.ok(data.session?.access_token&&data.user?.id,'Expected real JWT session');
 return data.user.id;
};
const ownerId=await signIn(owner,get('ZAPRUDA_E2E_OWNER_EMAIL'),get('ZAPRUDA_E2E_OWNER_PASSWORD'));
const inviteeId=await signIn(invitee,get('ZAPRUDA_E2E_INVITEE_EMAIL'),get('ZAPRUDA_E2E_INVITEE_PASSWORD'));
assert.notEqual(ownerId,inviteeId,'Accounts must be independent');
const {data:club,error:clubError}=await owner.from('social_groups').select('owner_id').eq('id',group).single();
if(clubError)throw clubError;
assert.equal(club.owner_id,ownerId,'Fixture club must belong to owner account');
const {data:membership,error:membershipError}=await owner.from('social_group_members').select('status').eq('group_id',group).eq('user_id',inviteeId).maybeSingle();
if(membershipError)throw membershipError;
assert.equal(membership,null,'Fixture must not already include invitee');
assert.ok(club.owner_id===ownerId);
const probeBody='QA E2E privacy probe '+new Date().toISOString();
const {data:probe,error:probeError}=await owner.from('social_group_messages')
 .insert({group_id:group,user_id:ownerId,body:probeBody}).select('id').single();
if(probeError)throw probeError;
assert.ok(probe.id,'An actual private message must exist before checking RLS');
const {data:preJoinChat,error:preJoinError}=await invitee.from('social_group_messages').select('id').eq('group_id',group).limit(1);
assert.equal(preJoinError,null,'Pending-invitee read should be filtered by RLS, not error');
assert.equal(preJoinChat.length,0,'Non-member must not read an existing private club message');
const {error:forgedInviteError}=await invitee.from('social_group_members').insert({
 group_id:group,user_id:inviteeId,role:'owner',status:'accepted',invited_by:null,
});
assert.ok(forgedInviteError,'Invitee must not self-enroll as owner');


const {error:inviteError}=await owner.from('social_group_members').insert({
 group_id:group,user_id:inviteeId,role:'member',status:'pending',invited_by:ownerId,
});
if(inviteError)throw inviteError;
const {data:pending,error:pendingError}=await invitee.from('social_group_members').select('status').eq('group_id',group).eq('user_id',inviteeId).single();
if(pendingError)throw pendingError;
assert.equal(pending.status,'pending');
const {data:beforeAcceptChat,error:beforeAcceptError}=await invitee.from('social_group_messages').select('id').eq('group_id',group).limit(1);
assert.equal(beforeAcceptError,null);
assert.equal(beforeAcceptChat.length,0,'Pending member must not read an existing private message');

const {data:accepted,error:acceptError}=await invitee.from('social_group_members').update({status:'accepted'}).eq('group_id',group).eq('user_id',inviteeId).select('status').single();
if(acceptError)throw acceptError;
assert.equal(accepted.status,'accepted');
const {data:postAcceptChat,error:postAcceptError}=await invitee.from('social_group_messages').select('id').eq('id',probe.id);
if(postAcceptError)throw postAcceptError;
assert.equal(postAcceptChat.length,1,'Accepted member must now read owner private message');
const body='E2E club message '+new Date().toISOString();
const {data:msg,error:sendError}=await invitee.from('social_group_messages').insert({group_id:group,user_id:inviteeId,body}).select('id').single();
if(sendError)throw sendError;
const {data:read,error:readError}=await owner.from('social_group_messages').select('id').eq('id',msg.id);
if(readError)throw readError;
assert.equal(read.length,1,'Owner must read accepted member message');
const {data:session}=await outsider.auth.getSession();
assert.equal(session.session,null,'Outsider must be unauthenticated');
const {data:outsiderRead,error:outsiderError}=await outsider.from('social_group_messages').select('id').eq('id',msg.id);
if(outsiderError && !['42501'].includes(outsiderError.code))throw outsiderError;
assert.equal(outsiderRead?.length??0,0,'Unauthenticated client cannot read club message');
console.log('PASS: two real STAGING JWT sessions, invite/accept, private club chat. WARNING: disposable fixture membership/message remain for explicit cleanup.');
await owner.auth.signOut();await invitee.auth.signOut();
