const encoder = new TextEncoder();
function field(submission, key, max, required = false) {
  const value = submission[key];
  if (value == null || value === '') { if (required) throw new Error(key); return null; }
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(key);
  return value.trim() || null;
}
async function mapLead(payload, expectedForm) {
  if (!payload || payload.form !== expectedForm || !payload.submission || typeof payload.submission !== 'object') throw new Error('form');
  const s = payload.submission;
  const email = field(s, 'email', 320, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email');
  const phone = field(s, 'phone', 80, true);
  // Keep legacy inquiries even if their phone is unusual; original phone is retained.
  const eventType = field(s, 'eventType', 40, true);
  if (!['corporate','wedding','private','bar-mitzvah','birthday','other'].includes(eventType)) throw new Error('type');
  const eventDate = field(s, 'eventDate', 10);
  if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(Date.parse(eventDate)) || new Date(eventDate).toISOString().slice(0,10) !== eventDate)) throw new Error('date');
  const guests = field(s, 'guestCount', 6);
  if (guests && (!/^\d+$/.test(guests) || Number(guests) < 1 || Number(guests) > 100000)) throw new Error('guests');
  const submissionId = field(s, 'submissionId', 36);
  if (submissionId && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(submissionId)) throw new Error('id');
  const submittedAt = field(s, '_date', 80, true);
  if (!Number.isFinite(Date.parse(submittedAt))) throw new Error('submitted_at');
  // Legacy forms: canonical provider payload fingerprint, including provider timestamp.
  const canonical = JSON.stringify([payload.form, Object.keys(s).sort().map(k => [k, s[k]])]);
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonical));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return {
    source_key: `${expectedForm}:${submissionId || fingerprint}`,
    submitted_at: submittedAt, full_name: field(s, 'fullName', 250, true),
    email, phone, event_type: eventType, event_date: eventDate,
    event_location: field(s, 'eventLocation', 250), guest_count: guests ? Number(guests) : null,
    message: field(s, 'message', 20000, true), language: ['en','he'].includes(s.language) ? s.language : null,
    source: 'website', status: 'new'
  };
}

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
function makeDirectHandler(env, fetcher=fetch) {
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

Deno.serve(makeDirectHandler({
 SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
 SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 TURNSTILE_SECRET_KEY: Deno.env.get('TURNSTILE_SECRET_KEY'),
}));
