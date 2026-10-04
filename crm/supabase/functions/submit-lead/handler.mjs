import { mapLead } from '../formspree-lead/handler.mjs';
const origin = 'https://arielnoy27.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Vary':'Origin'};
function reply(status, message) {return new Response(JSON.stringify({ok:status===200,message}),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
async function body(request) {
 const reader=request.body?.getReader();if(!reader)throw Error('empty');
 let length=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>32768){await reader.cancel();throw Error('large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function makeDirectHandler(env, fetcher=fetch) {
 return async request=>{
  if(request.headers.get('origin')!==origin)return reply(403,'Origin rejected');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply(405,'POST required');
  if(!env.TURNSTILE_SECRET_KEY||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'Intake not configured');
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply(415,'JSON required');
  let data,lead;
  try{
   data=await body(request);
   if(!data||typeof data!=='object'||Array.isArray(data))throw Error('object');
   if(typeof data.submissionId!=='string'||!data.submissionId)throw Error('id');
   if(typeof data.turnstileToken!=='string'||data.turnstileToken.length>2048||!data.turnstileToken)throw Error('token');
   lead=await mapLead({form:'direct',submission:{...data,_date:new Date().toISOString()}},'direct');
   const digits=lead.phone.replace(/\D/g,'');
   if(!/^[+\d\s().-]+$/.test(lead.phone)||digits.length<7||digits.length>15)throw Error('phone');
  }catch{return reply(422,'Check your fields and complete verification');}
  try{
   const verification=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.turnstileToken}),signal:AbortSignal.timeout(8000)
   });
   if(!verification.ok)return reply(503,'Verification unavailable');
   const result=await verification.json();
   if(result.success!==true||result.hostname!=='arielnoy27.github.io'||result.action!=='lead')return reply(403,'Verification failed; please retry');
   const saved=await fetcher(`${env.SUPABASE_URL}/rest/v1/leads?on_conflict=source_key`,{
    method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},
    body:JSON.stringify(lead),signal:AbortSignal.timeout(8000)
   });
   if(!saved.ok){console.error('Lead write failed',saved.status);return reply(503,'Storage unavailable; please retry');}
   return reply(200,'Inquiry saved');
  }catch{return reply(503,'Unable to confirm receipt; please retry');}
 };
}
