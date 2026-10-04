import { makeHandler } from './handler.mjs';
Deno.serve(makeHandler({
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  FORMSPREE_SIGNING_SECRET: Deno.env.get('FORMSPREE_SIGNING_SECRET'),
  FORMSPREE_FORM_ID: Deno.env.get('FORMSPREE_FORM_ID'),
}));
