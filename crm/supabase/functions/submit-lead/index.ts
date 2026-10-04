import { makeDirectHandler } from './handler.mjs';
Deno.serve(makeDirectHandler({
 SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
 SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 TURNSTILE_SECRET_KEY: Deno.env.get('TURNSTILE_SECRET_KEY'),
}));
