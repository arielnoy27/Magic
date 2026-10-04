import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {makeHandler, mapLead, verifySignature} from './supabase/functions/formspree-lead/handler.mjs';
const secret = 'test-only-secret';
const payload = {form: 'xkoqwpee', submission: {_date:'2026-10-03T18:00:00Z', fullName:'Test Customer',email:'test@example.com',phone:'050-1234567',eventType:'wedding',message:'Test inquiry',eventDate:'2026-12-12',guestCount:'150',submissionId:'d7e95bd2-02cd-4a75-84cf-0b90b07e54e2'}};
const raw = JSON.stringify(payload);
const timestamp = Math.floor(Date.now()/1000);
function signature(body = raw, time = timestamp) { return `t=${time},v1=${createHmac('sha256',secret).update(`${time}.${body}`).digest('hex')}`; }
function request(body = raw, sig = signature(body)) {return new Request('https://example.test/hook',{method:'POST',headers:{'Formspree-Signature':sig},body});}
const env = {SUPABASE_URL:'https://example.test', SUPABASE_SERVICE_ROLE_KEY:'fake-test-key', FORMSPREE_SIGNING_SECRET:secret,FORMSPREE_FORM_ID:'xkoqwpee'};
test('signature accepts signed raw body and rejects forgery, malformed and expired signatures',async()=>{
 const bytes=new TextEncoder().encode(raw);
 assert.equal(await verifySignature(bytes,signature(),secret),true);
 for(const sig of ['', 't=1,v1=xx',signature(raw,timestamp-600),signature(raw+' ')]) assert.equal(await verifySignature(bytes,sig,secret),false);
});
test('maps structured fields and separates new events from delivery retries',async()=>{
 const one=await mapLead(payload,'xkoqwpee');
 assert.equal(one.guest_count,150);
 assert.equal(one.source_key,(await mapLead(payload,'xkoqwpee')).source_key);
 const other=structuredClone(payload);other.submission.submissionId='b7e95bd2-02cd-4a75-84cf-0b90b07e54e2';
 assert.notEqual(one.source_key,(await mapLead(other,'xkoqwpee')).source_key);
});
test('legacy retries use a stable fingerprint regardless of key order',async()=>{
 const old=structuredClone(payload);delete old.submission.submissionId;
 const reordered={form:old.form,submission:Object.fromEntries(Object.entries(old.submission).reverse())};
 assert.equal((await mapLead(old,old.form)).source_key,(await mapLead(reordered,old.form)).source_key);
});
test('invalid date, guest count, wrong form and nested values are rejected',async()=>{
 for(const [key,value] of [['eventDate','2026-02-30'],['guestCount','1.5'],['email',{}]]) {
 const bad=structuredClone(payload);bad.submission[key]=value;await assert.rejects(mapLead(bad,'xkoqwpee'));
 }
 await assert.rejects(mapLead(payload,'other'));
});
test('forgery never reaches database and write failure is not acknowledged',async()=>{
 let calls=0;
 const handler=makeHandler(env,async()=>{calls++;return new Response('',{status:503});});
 assert.equal((await handler(request(raw,'bad'))).status,401);assert.equal(calls,0);
 assert.equal((await handler(request())).status,503);assert.equal(calls,1);
});
test('writes use conflict ignore so retries cannot overwrite pipeline changes',async()=>{
 const handler=makeHandler(env,async(url,options)=>{
 assert.match(url,/on_conflict=source_key/);assert.match(options.headers.Prefer,/ignore-duplicates/);
 assert.equal(JSON.parse(options.body).full_name,'Test Customer');return new Response(null,{status:201});});
 assert.equal((await handler(request())).status,200);
});
test('rejects oversized requests, wrong method and missing configuration',async()=>{
 const handler=makeHandler(env,async()=>{throw Error('must not write');});
 assert.equal((await handler(request('x'.repeat(65537)))).status,413);
 assert.equal((await handler(new Request('https://example.test'))).status,405);
 assert.equal((await makeHandler({})(request())).status,503);
});
