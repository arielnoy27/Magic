const encoder = new TextEncoder();
const MAX_BODY = 65536;
function reply(status) { return new Response(JSON.stringify({ok: status < 300}), {status, headers: {'Content-Type': 'application/json'}}); }
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
export async function verifySignature(bytes, header, secret, now = Date.now()) {
  const match = /^t=(\d+),v1=([a-f0-9]{64})$/i.exec((header || '').replace(/\s/g, ''));
  if (!match || Math.abs(now / 1000 - Number(match[1])) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']);
  const prefix = encoder.encode(`${match[1]}.`);
  const signed = new Uint8Array(prefix.length + bytes.length); signed.set(prefix); signed.set(bytes, prefix.length);
  const signature = Uint8Array.from(match[2].match(/../g), h => parseInt(h, 16));
  return crypto.subtle.verify('HMAC', key, signature, signed);
}
function field(submission, key, max, required = false) {
  const value = submission[key];
  if (value == null || value === '') { if (required) throw new Error(key); return null; }
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(key);
  return value.trim() || null;
}
export async function mapLead(payload, expectedForm) {
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
export function makeHandler(env, fetcher = fetch) {
  return async request => {
    if (request.method !== 'POST') return reply(405);
    const {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FORMSPREE_SIGNING_SECRET, FORMSPREE_FORM_ID} = env;
    if (![SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FORMSPREE_SIGNING_SECRET, FORMSPREE_FORM_ID].every(Boolean)) return reply(503);
    let bytes;
    try { bytes = await readBody(request); } catch { return reply(413); }
    if (!await verifySignature(bytes, request.headers.get('Formspree-Signature'), FORMSPREE_SIGNING_SECRET)) return reply(401);
    let lead;
    try { lead = await mapLead(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)), FORMSPREE_FORM_ID); }
    catch { return reply(422); }
    try {
      const response = await fetcher(`${SUPABASE_URL}/rest/v1/leads?on_conflict=source_key`, {
        method: 'POST', headers: {apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal'},
        body: JSON.stringify(lead), signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) { console.error('CRM database write failed', response.status); return reply(503); }
      return reply(200);
    } catch { console.error('CRM database unavailable'); return reply(503); }
  };
}
